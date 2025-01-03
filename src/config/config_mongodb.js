"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectMongodb = connectMongodb;
var mongoose_1 = require("mongoose");
var dotenv_1 = require("dotenv");
dotenv_1.default.config();
var uri = process.env.MONGODB_API;
function connectMongodb() {
    mongoose_1.default.connect(uri).then(function () { return console.log('connected succcessfully to MONGODB'); })
        .catch(function (err) { return console.log("Cannot connected to MONGODB: ", err); });
}
