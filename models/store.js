var mongoose = require("mongoose");
var StoreSchema = mongoose.Schema({
    term: String,
    data: {
        id: String,
        def: String,
        img: String,
        capt: String
    },
    createdAt: { type: Date, expires: '10m', default: Date.now }
});

module.exports = mongoose.model("Store", StoreSchema);