const express = require('express');
const { verify } = require('jsonwebtoken');
const router = new express.Router;
const auth = require('../auth/auth');
const user = require('../models/userModel');
const room = require("../models/messages/room");
const message = require("../models/messages/messages");
const { json } = require('express/lib/response');
const messages = require('../models/messages/messages');
const requests = require('../models/friends/friendRequests');
const { io, getUser } = require('../app');
const { pushNotification } = require('../utilities/pushNotification');
const notification = require('../models/notifications/notifcationModel');
const onlineUsers = require('../app');
const req = require('express/lib/request');


router.post('/create-chatroom/:contact_id', auth.verifyUser, function (req, res) {
    const user_ = req.userInfo._id.toString();
    const contact = req.params.contact_id.toString();

    if (user_ === "" || contact === "") {
        return json({ message: "Invalid Operation!", type: "error" })
    }
    else if (contact === user_) {
        return res.json({ message: "Invalid Operation", type: "error" })
    }
    else {
        // create a chat room for user and the chosen contact
        room.find({ users: [user_, contact] }).then(function (chatroom) {
            if (chatroom.length === 0) {
                room.find({ users: [contact, user_] }).then(function (chatroom1) {
                    if (chatroom1.length === 0) {
                        const s = new room({
                            users: [user_, contact],
                            createrRequester: user_,
                            requestReceiver: contact,
                            isAccepted: false
                        });
                        s.save();
                        const roomId = s._id.toString()

                        const friendReqs = new requests({
                            toRoom: roomId,
                            sender: user_,
                            receiver: contact
                        })
                        friendReqs.save();
                        // push notification
                        // const notification = pushNotification(user_, contact, "sent you a friend request")
                        var receiverUsername = "";
                        var today = new Date();
                        var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
                        user.findById(user_).then(function (data) {
                            console.log(data.username)
                            receiverUsername = data.username;
                            const notification_ = notification({
                                user: contact,
                                notification: `${receiverUsername} sent you a friend request`,
                                date: new Date(Date.now()),
                                time: time
                            });

                            notification_.save();
                            console.log(onlineUsers)
                            // getUser
                        });
                        console.log("Users" + onlineUsers)

                        res.json({ message: 'User is added as friend', type: "success" });

                    } else {
                        console.log("Users" + onlineUsers)

                        res.json({ message: "User is already added", type: "error" });
                    }
                })
            } else {

                res.json({ message: "User is already added", type: "error" })
            }
        });
    }

});



router.post('/send-message/:roomId', auth.verifyUser, function (req, res) {
    messageData = req.body;
    saveMessage = new message(messageData);
    roomId = req.params.roomId;

    if (roomId === "" || null) {
        res.json({ "data": "No data!" });
    }
    else {
        chatroom = room.findById({ _id: roomId }).then(function (room) {
            saveMessage.roomId = room._id.toString();
            saveMessage.sentBy = req.userInfo._id.toString();
            saveMessage.save();
            res.json({ "status": "success" })
        }).catch(function (error) {
            res.json({ error: error });
        });
    }
});

// router.post('/send-image-message', auth.verifyUser, upload.single('image'), function (req, res) {
//     console.log(req.body)
//     // console.log(req.file.path)
//     const message_ = message({
//         roomId: req.body.roomId,
//         message: req.body.message,
//         sentTo: req.body.sentTo,
//         sentBy: req.body.sentBy,
//         data: req.body.date,
//         time: req.body.time
//     });
//     message_.save();
//     io.to(message_.roomId.toString()).emit("receive_message", message_);

// })

router.post('/inbox/:contact_id', auth.verifyUser, function (req, res) {
    const userId = req.userInfo._id.toString();
    const contactId = req.params.contact_id.toString();


    if (userId === "" || contactId === "") {
        res.json({ data: "No data!" });
    } else {
        // searching room where userId and contactId both contact exist in that room
        const user_ = room.findOne({ users: [userId, contactId] }).then(function (data) {
            // finding all the messages saved in this roomId
            if (data === null) {
                room.findOne({ users: [contactId, userId] }).then(function (data) {
                    if (data === null) {
                        res.json({ error: "This user is not a friend" });
                    } else {
                        const message = messages.find({ roomId: data._id }).populate('sentBy').then(function (messageData) {
                            // sending all message document for roomId
                            const contactData = user.findById({ _id: contactId }).then(function (cData) {
                                res.json({ roomId: data._id, messagesData: messageData, contact: cData });
                            });
                        });
                    }
                })
            }
            else {
                const message = messages.find({ roomId: data._id }).populate('sentBy').then(function (messageData) {
                    // sending all message document for roomId
                    const contactData = user.findById({ _id: contactId }).then(function (cData) {
                        res.json({ roomId: data._id, messagesData: messageData, contact: cData });
                    });
                });
            }
        })
    }
});


router.get('/rooms', auth.verifyUser, function (req, res) {
    user.findById(req.userInfo._id).then(function (data) {
        res.json({ chats: data.rooms })
    })
});


router.get('/chats/:roomId', auth.verifyUser, function (req, res) {
    console.log(req.params.roomId)
    if (req.params.roomId !== null) {
        const roomId = req.params.roomId;
        room.findById(req.params.roomId).then(function (data) {
            console.log("data")
            if (data) {
                const users_ = data.users
                for (var i = 0; i <= users_.length; i++) {
                    if (users_[i] !== req.userInfo._id.toString()) {
                        user.findById(users_[i]).then(function (result) {
                            if (result) {
                                console.log(result.image)
                                messages.findOne({ roomId: roomId }).sort({ _id: -1 }).then(function (data) {
                                    var message;
                                    if (data) {
                                        message = data
                                    } else {
                                        message = { message: "Say hello to your new friend!", sentTo: req.userInfo._id }
                                    }
                                    const contact = { id: result._id, firstName: result.firstName, lastName: result.lastName, username: result.username, message: message, image: result?.image, isActive: result.isActive }

                                    res.json(contact);
                                })
                            }
                        })
                    }
                }
            } else {
                console.log("no data found")
            }

        });
    } else {
        return
    }
});


router.post('/set-message-read/:messageId', auth.verifyUser, function (req, res) {
    console.log(req.params.messageId)
    message.findByIdAndUpdate(req.params.messageId, { isRead: true }).sort({ _id: -1 }).then(function (err, docs) {
        if (err) {
            console.log(err)
        }
        else {
            console.log("Updated!")
        }
    });
})
module.exports = router;