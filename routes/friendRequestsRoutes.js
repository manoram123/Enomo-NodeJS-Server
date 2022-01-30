const express = require('express');
const router = new express.Router;
const auth = require('../auth/auth');
const user = require('../models/userModel');
const room = require("../models/messages/room");
const { json } = require('express/lib/response');
const requests = require('../models/friends/friendRequests');
const { request } = require('express');
const notification = require('../models/notifications/notifcationModel');
const userNotification = require('../models/notifications/userNotification');
const pushNotification = require('../utilities/pushNotification');
const { io } = require('../app');



router.get('/friend-requests', auth.verifyUser, function (req, res) {
    requests.find({ receiver: req.userInfo._id }).populate('sender').then(function (result) {
        res.json({ data: result })
    });
});

// router.get('/friend-requests', auth.verifyUser, function (req, res) {
//     requests.find({ receiver: req.userInfo._id }).then(function (result) {
//         // console.log(req.params.userId.toString())
//         res.json({ data: result })
//     })
// });


router.get('/sent-requests', auth.verifyUser, function (req, res) {
    requests.find({ sender: req.userInfo._id }).populate('receiver').then(function (data) {
        res.json({ data: data })
    })
});


router.post('/accept-request/:sender', auth.verifyUser, function (req, res) {
    const receiver = req.userInfo._id
    const sender = req.params.sender
    requests.findOne({ sender: sender, receiver: receiver }).then(function (result) {
        console.log(result.toRoom);
        const roomId = result.toRoom;
        room.findByIdAndUpdate(roomId, { isAccepted: true }, function (err, docs) {
            if (err) {
                console.log(err)
            } else {
                console.log("Updated!")
            };
        });

        // add room id to user's database
        user.findById(receiver).then(function (data) {
            const newRoom = data.rooms
            newRoom.push(roomId);
            user.findByIdAndUpdate(receiver, { rooms: newRoom }, function (error, docs) {
                if (error) {
                    console.log(error)
                } else {
                    console.log("Updated!")
                }
            });
        });

        // add room id to contact's database
        user.findById(sender).then(function (data) {
            const newRoom = data.rooms
            newRoom.push(roomId);
            user.findByIdAndUpdate(sender, { rooms: newRoom }, function (error, docs) {
                if (error) {
                    console.log(error)
                } else {
                    console.log("Updated!")
                }
            });
        });

        // delete friend request model
        requests.findOneAndDelete({ sender: sender, receiver: receiver }, function (err, docs) {
            if (err) {
                console.log(err)
            } else {
                console.log("Deleted")
            }
        });

        // push notification
        var receiverUsername = "";
        var today = new Date();
        var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
        user.findById(receiver).then(function (data) {
            console.log(data.username)
            receiverUsername = data.username;
            notification({
                user: sender,
                notification: `${receiverUsername} accepted your friend request`,
                date: new Date(Date.now()),
                time: time
            }).save();
        });

        // pushNotification(receiver, sender, "accepted your friend request")



        res.json({ message: "Friend Request Accepted", type: "success" })
    });
});
module.exports = router;