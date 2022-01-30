const mongoose = require('mongoose');
const schema = mongoose.Schema;


const messages = mongoose.model("Message", {
    roomId: { type: schema.Types.ObjectId, ref: 'Room' },
    message: { type: String },
    sentBy: { type: schema.Types.ObjectId, ref: 'User' },
    sentTo: { type: schema.Types.ObjectId, ref: 'User' },
    date: { type: Date },
    time: { type: String },
    isRead: { type: Boolean, default: false },
    image: { type: String }
});

module.exports = messages;