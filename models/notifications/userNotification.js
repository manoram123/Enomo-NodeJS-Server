const mongoose = require('mongoose');
const notification = require('./notifcationModel');

const userNotification = mongoose.model("UserNotification", {
    user: { type: String },
    notification: { type: [], default: [] }
})

module.exports = userNotification;