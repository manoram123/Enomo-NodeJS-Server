const mongoose = require('mongoose');
const schema = mongoose.Schema

const room = mongoose.model("Room", {
    users: { type: [] },
    createrRequester: { type: schema.Types.ObjectId, ref: "User" },
    reqReceiver: { type: schema.Types.ObjectId, ref: "User" },
    isAccepted: { type: Boolean },
});

module.exports = room;