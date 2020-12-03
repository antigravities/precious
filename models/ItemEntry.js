module.exports = async (db, sequelize, tname) => {
    let table = db.define(tname, {
        time: {
            type: sequelize.DATE,
            allowNull: false
        },

        bid: {
            type: sequelize.DECIMAL(10,2),
            allowNull: false
        },
        ask: {
            type: sequelize.DECIMAL(10,2),
            allowNull: false
        },

        bitskins: {
            type: sequelize.DECIMAL(10,2)
        },

        backpack: {
            type: sequelize.DECIMAL(10,2)
        }
    });

    await table.sync();

    return table;
}