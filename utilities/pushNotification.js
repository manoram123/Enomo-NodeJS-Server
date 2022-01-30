const user = require('../models/userModel');
const notification = require('../models/notifications/notifcationModel');

exports.pushNotification = (user_, contact, message) => {
    // push notification
    var enotification_;
    var receiverUsername = "";
    var today = new Date();
    var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
    user.findById(user_).then(function (data) {
        console.log(data.username)
        receiverUsername = data.username;
        const notification_ = notification({
            user: contact,
            notification: `${receiverUsername} ${message}`,
            date: new Date(Date.now()),
            time: time
        });

        notification_.save();
    });
}