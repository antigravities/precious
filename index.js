const fs = require("fs");

const express = require("express");
const request = require("request-promise");
const cron = require("cron").CronJob;
const sequelize = require("sequelize");
const config = JSON.parse(fs.readFileSync("config.json"));
const Bitskins = require("bitskins");
const importOnly = process.argv.length > 4 && process.argv[2] == "import" && config.track[process.argv[3]] && fs.existsSync(process.argv[4]);

const Op = sequelize.Op;

const ItemEntry = require("./models/ItemEntry.js");

const Models = {};
const Jobs = {};

let backpack_ref = {
    age: 0
};

const db = new sequelize(config.connectionString, { logging: false });
let app;

if( ! importOnly ){
    app = express();

    app.use(express.static("static"));

    app.listen(process.env.PORT || 3000);
}

(async () => {
    if( ! importOnly ){
        app.get("/items", (req, res) => {
            let trk = {};

            Object.keys(config.track).forEach(i => {
                trk[i] = config.track[i].name;
            });

            res.end(JSON.stringify(trk));
        });
    }

    for( let i=0; i<Object.keys(config.track).length; i++ ){
        let item = Object.keys(config.track)[i];

        Models[item] = await ItemEntry(db, sequelize, item);

        if( ! importOnly ){
            let n = (Object.keys(config.track).indexOf(item)%5);
            let atMinutes = [];

            while( n < 60 ){
                atMinutes.push(n+5);
                n+=5;
            }
            atMinutes[atMinutes.length-1]-=60;

            Jobs[item] = new cron("0 " + atMinutes.sort((a, b) => a-b).join(",") + " * * * *", async () => {
                if( ! config.track[item].averageOf ){
                    let bs;

                    if( config.track[item].bitskins ){
                        bs = new Bitskins.API(config.bitskins.key, config.bitskins.secret, config.track[item].bitskins[1]);
                    }

                    if( config.track[item].backpack ){
                        if( Date.now()-backpack_ref.age > 300000 ){
                            backpack_ref = JSON.parse(await request("https://backpack.tf/api/IGetPriceHistory/v1?appid=440&item=Refined Metal&quality=Unique&tradable=Tradable&craftable=Craftable&priceindex=0&key=" + config.backpack)).response.history.pop();
                            backpack_ref.age = Date.now();
                        }
                    }

                    console.log("Getting item " + item + " with econid " + config.track[item].econid);
                    
                    try {
                        let info = JSON.parse(await request("https://steamcommunity.com/market/itemordershistogram?country=US&language=english&currency=1&item_nameid=" + config.track[item].econid + "&two_factor=0"));
                        let bitskins = false;
                        let backpack = false;

                        if( bs && config.track[item].bitskins ){
                            let sales = (await bs.getRecentSaleInfo(config.track[item].bitskins[0])).sales;
                            let last = sales.pop();
                            bitskins = sales.reduce((a,v) => (a+parseFloat(v.price))/2, parseFloat(last.price));
                        }

                        if( config.track[item].backpack ){
                            let resp = JSON.parse(await request("https://backpack.tf/api/IGetPriceHistory/v1?appid=" + config.track[item].backpack[0] + "&item=" + config.track[item].backpack[1] + "&quality=" + config.track[item].backpack[2] + "&tradable=" + config.track[item].backpack[3] + "&craftable=" + config.track[item].backpack[4] + "&priceindex=0&key=" + config.backpack)).response.history.pop();
                            if( resp.currency == "usd" ) backpack = resp.value;
                            else if( resp.currency == "metal" ) backpack = resp.value*backpack_ref.value;
                            else {
                                console.log(item + ": Backpack didn't return a currency I know about");
                            }
                        }

                        let tx = Models[item].build({
                            time: new Date(),
                            bid: info.highest_buy_order/100,
                            ask: info.lowest_sell_order/100,
                            bitskins: bitskins,
                            backpack: backpack
                        });

                        console.log(item + ": " + backpack);

                        await tx.save();
                    } catch(e){
                        console.log("Failed getting item " + item + " with econid " + config.track[item].econid + ": " + e);
			console.log(e.stack);
                    }
                } else {
                    let average = {};
                    average.bid = 0.0;
                    average.ask = 0.0;
                    average.bitskins = 0.0;
                    average.backpack = 0.0;

                    for( let i=0; i<config.track[item].averageOf.length; i++ ){
                        let lastPricesForItem = await Models[config.track[item].averageOf[i]].findOne({
                            attributes: [ "bid", "ask", "bitskins", "backpack" ],
                            order: [ [ "time", "DESC" ] ]
                        });

                        if( ! lastPricesForItem ) continue;

                        if( lastPricesForItem.bitskins && lastPricesForItem.bitskins != 0 ) {
                            average.bitskins+=parseFloat(lastPricesForItem.bitskins);
                            if( i > 0 ) average.bitskins/=2;
                        }

                        if( lastPricesForItem.backpack && lastPricesForItem.backpack != 0 ) {
                            average.backpack+=parseFloat(lastPricesForItem.backpack);
                            if( i > 0 ) average.backpack/=2;
                        }

                        if( lastPricesForItem.bid && lastPricesForItem.bid != 0 ) {
                            average.bid+=parseFloat(lastPricesForItem.bid);
                            if( i > 0 ) average.bid/=2;
                        }

                        if( lastPricesForItem.ask && lastPricesForItem.ask != 0 ) {
                            average.ask+=parseFloat(lastPricesForItem.ask);
                            if( i > 0 ) average.ask/=2;
                        }
                    }

                    let tx = Models[item].build({
                        time: new Date(),
                        bid: average.bid,
                        ask: average.ask,
                        bitskins: average.bitskins,
                        backpack: average.backpack
                    });

                    await tx.save();
                }
            });
            Jobs[item].start();

            app.get("/items/" + item + "/:start(\\d{13})/:end(\\d{13})", async (req, res) => {
                let attrs = [ "time", "bid", "ask" ];

                if( config.track[item].bitskins ){
                    attrs.push("bitskins");
                }

                if( config.track[item].backpack ){
                    attrs.push("backpack");
                }

                let stuff = await Models[item].findAll({
                    attributes: attrs,
                    where: {
                        time: {
                            [Op.lte]: parseInt(req.params.end),
                            [Op.gte]: parseInt(req.params.start)
                        }
                    },
                    order: [
                        [ "time", "ASC" ]
                    ]
                });

                let resp = {
                    points: stuff,
                    metadata: {
                        title: config.track[item].name
                    }
                };

                res.end(JSON.stringify(resp));
            });

            app.get("/d3/" + item + "/:start(\\d{13})/:end(\\d{13})", async (req, res) => {
                let attrs = [ "time", "bid", "ask" ];

                if( config.track[item].bitskins ){
                    attrs.push("bitskins");
                }

                if( config.track[item].backpack ){
                    attrs.push("backpack");
                }

                let stuff = await Models[item].findAll({
                    attributes: attrs,
                    where: {
                        time: {
                            [Op.lte]: parseInt(req.params.end),
                            [Op.gte]: parseInt(req.params.start)
                        }
                    },
                    order: [
                        [ "time", "ASC" ]
                    ]
                });

                let resp = {};

                resp.data = [
                    {
                        type: 'scatter',
                        mode: 'lines',
                        name: 'Bid',
                        x: stuff.map(i => i.time),
                        y: stuff.map(i => i.bid)
                    },
                    {
                        type: 'scatter',
                        mode: 'lines',
                        name: 'Ask',
                        x: stuff.map(i => i.time),
                        y: stuff.map(i => i.ask)
                    }
                ];

                if( config.track[item].bitskins && stuff[0].bitskins ){
                    resp.data.push({
                        type: 'scatter',
                        mode: 'lines',
                        name: 'BitSkins',
                        x: stuff.map(i => i.time),
                        y: stuff.map(i => i.bitskins)
                    });
                }

                if( config.track[item].backpack ){
                    resp.data.push({
                        type: 'scatter',
                        mode: 'lines',
                        name: 'Backpack.tf',
                        x: stuff.map(i => i.time),
                        y: stuff.map(i => i.backpack)
                    })
                }

                resp.layout = {
                    title: config.track[item].name
                }

                res.end(JSON.stringify(resp));
            });

            app.get("/current/" + item, async (req, res) => {
                let attrs = [ "time", "bid", "ask" ];

                if( config.track[item].averageOf || config.track[item].bitskins ){
                    attrs.push("bitskins");
                }

                if( config.track[item].backpack ){
                    attrs.push("backpack");
                }

                let cur = await Models[item].findOne({
                    attributes: attrs,
                    order: [
                        [ "time", "DESC" ]
                    ]
                });

                let resp = {};
                resp.point = cur;
                resp.title = config.track[item].name;
                resp.image = config.track[item].image;
                resp.marketplace = config.track[item].marketplace || false;
                resp.scmurl = config.track[item].scmurl || false;
                resp.average = config.track[item].averageOf ? config.track[item].averageOf.map(i => config.track[i].name) : false;
                resp.bitskins = cur.bitskins ? ( resp.average ? cur.bitskins : [ config.track[item].bitskins[0], config.track[item].bitskins[1], cur.bitskins ] ) : false;
                resp.backpack = cur.backpack ? cur.backpack : false;

                res.end(JSON.stringify(resp));
            });
        }
    }

    if( importOnly ){
        let items = fs.readFileSync(process.argv[4]).toString().split("\r\n");

        console.log("Beginning import of " + items.length + " items into table " + process.argv[3] + ".");
        console.log("This may take a long time depending on your database connection.");
        console.log("Please wait...");

        for( let i=0; i<items.length; i++ ){
            process.stdout.write("\rInserting record " + (i+1) + "/" + items.length + " (" + Math.round(((i+1)/items.length)*100) + "%)");

            let item = items[i].split(",");
	try {
            await (Models[process.argv[3]].build({
                bid: item[0],
                ask: item[1],
                time: new Date(item[2] + " GMT")
            })).save();
	} catch(e){ process.exit(console.log(item)); }
        }

        console.log("\nDone.");
    }
})();
