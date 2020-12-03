class CPrecious {
    constructor(){
        document.querySelector("#items").innerHTML = "";

        this.hpitems = localStorage["hpitems"] || [ "steam_gems", "tf2_tf2", "csgo_prisma", "csgo_full_average", "csgo_hydra", "tf2_tod" ];
        this.convertWindow = {};

        if( typeof this.hpitems == 'string' ) this.hpitems = this.hpitems.split(",");

        localStorage["hpitems"] = this.hpitems.join(",");

        this.hpitems.forEach(item => {
            document.querySelector("#items").innerHTML += `<div class='item' id='item-${item}'><h1 class='waiting'>...</h1></div>`;
        });

        document.querySelector("#items").innerHTML += `<div class='item' id='item-add'><div class='item-info'><p class='item-title'><img class='item-img' src='/img/exclaim.png'></img>Add another item</p><p class='item-prices'><select style='font-size: 0.8em;' id='add-item'></select></p></div><div class='item-extra'>Saves across reloads</div></div>`;
        this.fetchItems();

        this.hpitems.forEach(async item => {
            try {
                let info = await (await fetch("/current/" + item)).json();

                if( info.marketplace !== false ){
                    info.marketplace = "<a href='https://marketplace.tf/items/" + info.marketplace + "' title='Marketplace.tf'><img src='/img/marketplace.png' style='height: 1em; position: relative; top: -0.15em; vertical-align: middle;' class='item-icon'></img></a> | ";
                }

                if( info.bitskins !== false ){
                    if( info.average ){
                        info.bitskins = `<span title="We calculate BitSkins rates by taking the average of the last 30 sales across all items. For the purpose of averaging, prices that are zero are not factored in."><img src='/img/bitskins.png' class='item-icon' title='BitSkins'></img> (~$${info.bitskins})</span>`;
                    } else {
                        info.bitskins = `<a href="https://bitskins.com/?market_hash_name=${info.bitskins[0]}&appid=${info.bitskins[1]}" title="We calculate BitSkins rates by taking the average of the last 30 sales."><img src='/img/bitskins.png' class='item-icon' title='BitSkins'></img> (~$${info.bitskins[2]})</a> | `;
                    }
                }

                if( info.average !== false ){
                    info.average = ` | <span class="average" title="This is an average of ${info.average.join(', ')}.">Average (${info.average.length} items)</span>`;
                }

                if( info.scmurl !== false ){
                    info.scmurl = `<a href="https://steamcommunity.com/market/listings/${info.scmurl}"><img src='/img/steam.png' class='item-icon' title='Community Market'></img> SCM</a>`;
                }

                if( info.backpack !== false ){
                    info.backpack = `<a href="https://backpack.tf/"><img src='/img/backpack.png' class='item-icon' title='Backpack.tf'></img> (~$${info.backpack})</a> | `
                }

                document.querySelector("#item-" + item).innerHTML = `
                    <div class='item-info'>
                        <p class='item-title'><img class='item-img' src='${info.image}'></img>${info.title}</p>
                        <p class='item-prices'>$<span title='Bidding price'>${info.point.bid}</span>/$<span title='Asking price'>${info.point.ask}</span></p>
                    </div>
                    <div class='item-extra'>
                        ${info.bitskins ? info.bitskins : "" }
                        ${info.marketplace ? info.marketplace : ""}
                        ${info.backpack ? info.backpack : "" }
                        ${info.scmurl ? info.scmurl : "" }
                        ${info.average ? info.average : ''}
                        <a href="#" class="close fas fa-times"></a>
                    </div>
                    <div class='overlay overlay-main'>
                        <div class='icon-sel icon-sel-left graph'>
                            <a href='#graph,${item}' class='fas fa-chart-line'></a>
                        </div>
                        <div class='icon-sel icon-sel-right convert'>
                            <a href='#' class='fas fa-exchange-alt'></a>
                        </div>
                    </div>

                    <div class='overlay overlay-convert'>
                        <div class='icon-sel icon-sel-left'>
                            <input type='text' id='convert-${item}-item' placeholder='${info.title}'></input><br>
                            <input type='checkbox' id='fees-${item}-quicksell'></input><span class='normal' style='vertical-align: middle;' title='Sell at the bidding price instead of the asking.'>Quicksell</span>
                        </div>
                        <div class='icon-sel icon-sel-right'>
                            <input type='text' id='convert-${item}-usd' placeholder='USD'></input><br>
                            <input type='checkbox' id='fees-${item}-scm' checked></input><span class='normal' style='vertical-align: middle;' title='Include Steam Community Market fees in the result. Ignored when calculating from USD to item.'>SCM Fees</span>
                        </div>
                        <div class='overlay-close'>
                            <a href='#'>Close</a>
                        </div>
                    </div>
                `;

                document.querySelector("#item-" + item).addEventListener("mouseover", e => {
                    if( this.convertWindow[item] ) return;

                    // are we pointing at an icon, or the bottom "extra" panel?
                    if( Array.from(e.target.classList).indexOf("item-icon") > -1 || Array.from(e.target.classList).indexOf("item-extra") > -1 || Array.from(e.target.parentElement.classList).indexOf("item-extra") > -1 ) return;
                    document.querySelector("#item-" + item + " > .overlay").classList.add("overlay-visible");
                });

                document.querySelector("#item-" + item).addEventListener("mouseout", e => {
                    if( this.convertWindow[item] ) return;
                    if( Array.from(e.target.classList).indexOf("item-icon") > -1 || Array.from(e.target.classList).indexOf("item-extra") > -1 || Array.from(e.target.parentElement.classList).indexOf("item-extra") > -1 ) return;
                    document.querySelector("#item-" + item + " > .overlay").classList.remove("overlay-visible");
                });

                document.querySelector("#item-" + item + " > .overlay > .convert > a").addEventListener("click", e => {
                    e.preventDefault();

                    // we're using the convert overlay now, don't allow the regular overlay to show up
                    this.convertWindow[item] = true;
                    document.querySelector("#item-" + item + " > .overlay").classList.remove("overlay-visible");
                    document.querySelector("#item-" + item + " > .overlay-convert").classList.add("overlay-visible");
                });

                let last = "item";

                let recalculate = from => {
                    last = from;

                    if( from == "item" ){
                        let val = parseFloat(document.querySelector("#convert-" + item + "-item").value);

                        if( isNaN(val) ){
                            document.querySelector("#convert-" + item + "-usd").value = "Invalid value";
                            return;
                        }

                        let base = document.querySelector("#fees-" + item + "-quicksell").checked ? info.point.bid : info.point.ask;

                        let sub = val*base;

                        if( document.querySelector("#fees-" + item + "-scm").checked ){
                            // (1/1.15) is used to determine Valve's cut
                            sub = val*base*(1/1.15);
                        }

                        document.querySelector("#convert-" + item + "-usd").value = Math.round(sub*100)/100;
                    } else {
                        let val = parseFloat(document.querySelector("#convert-" + item + "-usd").value);

                        if( isNaN(val) ){
                            document.querySelector("#convert-" + item + "-item").value = "Invalid value";
                            return;
                        }

                        let base = document.querySelector("#fees-" + item + "-quicksell").checked ? info.point.bid : info.point.ask;
                        let sub = (val/base);

                        document.querySelector("#convert-" + item + "-item").value = Math.round(sub*1000)/1000;
                    }
                }

                document.querySelector("#convert-" + item + "-item").addEventListener("keyup", () => recalculate("item"));
                document.querySelector("#convert-" + item + "-usd").addEventListener("keyup", () => recalculate("usd"));
                document.querySelector("#fees-" + item + "-quicksell").addEventListener("change", () => recalculate(last));
                document.querySelector("#fees-" + item + "-scm").addEventListener("change", () => recalculate(last));

                document.querySelector("#item-" + item + " > .overlay-convert > .overlay-close > a").addEventListener("click", e => {
                    e.preventDefault();

                    // we're not using the convert overlay anymore, allow the regular overlay to show up
                    this.convertWindow[item] = false;
                    document.querySelector("#item-" + item + " > .overlay-convert").classList.remove("overlay-visible");
                });

                document.querySelector("#item-" + item + " > .overlay > .graph > a").addEventListener("click", e => {
                    e.preventDefault();
                    document.querySelector("#graph").classList.add("visible");
                    
                    this.graph(item);
                });

                document.querySelector("#item-" + item + " > .item-extra > .close").addEventListener("click", e => {
                    e.preventDefault();
                    this.removeItem(item);
                });

            } catch(e){
                console.log(e);
                document.querySelector("#item-" + item).innerHTML = `<div class='item-info'><p class='item-title'><img class='item-img' src='/img/exclaim.png'></img>Error</p><p class='item-prices'>Prices not found</p></div><div class='item-extra'>${item}</div>`;
            }
        });

        document.querySelector("#graph > .instructions > .close").addEventListener("click", e => {
            e.preventDefault();
            document.querySelector("#graph").classList.remove("visible");
        });

        window.addEventListener("resize", function(){
            if( window.Precious.item ){
                window.removeEventListener("resize", this);
                window.Precious.graph(window.Precious.item);
                window.addEventListener("resize", this);
            }
        });
    }

    async graph(item){
        Plotly.purge(document.querySelector("#graph"));

        this.item = item;

        Plotly.d3.json("/d3/" + item + "/" + (Date.now()-604800000) + "/" + Date.now(), (e, fig) => {
            if( e ) return;
            Plotly.plot(document.querySelector("#graph"), fig.data, fig.layout);

            document.querySelector("#graph").on('plotly_relayout', evt => {
                if (evt['xaxis.range[0]'] || evt['xaxis.range[1]']) {
                    Plotly.d3.json("/d3/" + item + "/" + new Date(document.querySelector("#graph").layout.xaxis.range[0] + " GMT").getTime() +  "/" + new Date(document.querySelector("#graph").layout.xaxis.range[1] + " GMT").getTime(), (e, fig) => {
                        if( e ) return;

                        // this is really hacky
                        // if you delete all of the lines and then try to replot, Plotly glitches out.
                        // so we just delete one line right now, and the rest after we've replotted
                        // I've tried other methods of doing this, and they just didn't work

                        let i = document.querySelector("#graph").data.length;

                        Plotly.plot(document.querySelector("#graph"), fig.data);

                        for( let j=0; j<i; j++ ){
                            Plotly.deleteTraces(document.querySelector("#graph"), 0);
                        }
                    });
                }
            });
        });
    }
    
    async fetchItems(){
        let items = await (await fetch("/items")).json();

        let sel = document.querySelector("#add-item");

        items = Object.assign({none: "Select an item..." }, items);

        Object.keys(items).forEach(i => {
            if( this.hpitems.indexOf(i) > -1 ) return;
            let chi = document.createElement("option");
            chi.innerText = items[i];
            chi.value = i;
            sel.appendChild(chi);
        });

        sel.addEventListener("change", e => {
            if( e.target.value == "none" ) return;
            this.pushItem(e.target.value);
        });
    }

    pushItem(item){
        let hpitems = localStorage["hpitems"].split(",");
        if( hpitems.indexOf(item) > -1 ) return;

        hpitems.push(item);
        localStorage["hpitems"] = hpitems.join(",");
        window.Precious = new CPrecious();
    }

    removeItem(item){
        let hpitems = localStorage["hpitems"].split(",");
        if( hpitems.indexOf(item) < 0 ) return;

        hpitems.splice(hpitems.indexOf(item), 1);
        localStorage["hpitems"] = hpitems.join(",");
        window.Precious = new CPrecious();
    }
}

window.CPrecious = CPrecious;