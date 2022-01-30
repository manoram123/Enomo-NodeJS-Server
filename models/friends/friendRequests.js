const mongoose = require('mongoose');
const schema = mongoose.Schema;

const requests = mongoose.model("FriendRequests", {
    toRoom: { type: String },
    sender: { type: schema.Types.ObjectId, ref: "User" },
    receiver: { type: schema.Types.ObjectId, ref: "User" },
});

module.exports = requests;