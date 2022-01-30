const mongoose = require('mongoose');

const notification = mongoose.model('Notification', {
    user: { type: String },
    notification: { type: String },
    date: { type: String },
    time: { type: String }
});

module.exports = notification;