const express = require('express');
const app = express();

// Socket.io imports
const cors = require('cors');
const { Server } = require('socket.io');
const http = require('http');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

require('./database/connect');
const userRoutes = require('./routes/userRoutes');
const messageRoutes = require('./routes/messagesRoutes');
const friendRequestsRoutes = require('./routes/friendRequestsRoutes');
const user = require('./models/userModel');
const message = require("./models/messages/messages");
const room = require("./models/messages/room");
const requests = require('./models/friends/friendRequests');
const notification = require('./models/notifications/notifcationModel');
const res = require('express/lib/response');
const pushNotification = require('./utilities/pushNotification');
const req = require('express/lib/request');
const auth = require('./auth/auth');
const multer = require('multer');




app.use(userRoutes);
app.use(messageRoutes);
app.use(friendRequestsRoutes);
app.use("/profile/files/userImage", express.static('files/userImage'));
app.use("/add-friend/files/userImage", express.static('files/userImage'));
app.use("/inbox/files/messageImages", express.static('files/messageImages'));


app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});

var onlineUsers = []

function removeUser(id) {
    onlineUsers = onlineUsers.filter(user => user.socketId !== id);
}

function getUser(userId) {
    // return onlineUsers.find((user) => JSON.parse(user).userId === userId)
    const sockets = [];
    for (var i = 0; i <= onlineUsers.length; i++) {
        const data = onlineUsers[i]
        if (data) {
            const data_ = JSON.parse(data)
            // console.log(userId)
            // console.log(data_.userId)
            if (data_.userId === userId) {
                // console.log("found")
                sockets.push(data_.socketId)
            }
        }

    }
    return sockets;
}


io.on('connection', (socket) => {
    console.log(`Client connected with id provided: ${socket.id}`);



    // joining the cliend to chat - room
    socket.on("join_room", (data) => {
        socket.join(data.roomId);
        console.log(`${data.user} Joined the Room ${data.roomId}`);
    })

    // socket.emit("userOnline",);


    socket.on("addClient", (data) => {
        if (data.socketId !== undefined) {
            if (onlineUsers.indexOf(data) === -1) {
                onlineUsers.push(JSON.stringify(data))
                const uniqueChars = [...new Set(onlineUsers)];
                // console.log(onlineUsers)
                onlineUsers = [...uniqueChars].reverse().reverse();
                // console.log(onlineUsers)
            }
        }

    });

    // const set = new Set(onlineUsers)
    // console.log([...set])



    // When client is typing
    socket.on("typing", (data) => {
        io.to(data.roomId).emit("isTyping", { typing: true, user: data.user })
    })

    // When user cancels typing
    socket.on("not-typing", (data) => {
        io.to(data.roomId).emit("notTyping", { typing: false, user: data.user })
    })

    // when clients sends message
    socket.on("send_message", (data) => {
        console.log(data)
        const messageData = data;
        saveMessage = new message(messageData);
        const roomId = data.roomId;

        if (roomId === "" || messageData.message === "") {
            console.log("No Data");
        }
        else {
            // Saving to messages model
            chatroom = room.findById({ _id: roomId }).then(function (room) {
                saveMessage.roomId = room._id.toString();
                saveMessage.save();
                io.to(room._id.toString()).emit("receive_message", data)

                // new message notification
                const sockets = getUser(messageData.sentTo);
                for (var i = 0; i <= sockets.length; i++) {
                    io.to(sockets[i]).emit("new-message", { message: messageData });
                }

            }).catch(function (error) {
                console.log("Error: " + error)
            });
        }
    });



    // Send user a friend request
    socket.on('create-chatroom', (data) => {
        const socket = data.socket
        const user_ = data.user;
        const contact = data.contact;

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
                                const sockets = getUser(contact)
                                io.to(socket).emit("sent-request", "Sent Request");

                                // sending notification to contact
                                for (var i = 0; i <= sockets.length; i++) {
                                    io.to(sockets[i]).emit("notification", { notification: notification_, request: friendReqs });
                                }
                            });



                        } else {
                            console.log("Already added")
                            io.to(socket).emit("sent-request", { message: "User is already added", type: "error" })
                        }
                    })
                } else {
                    console.log("Already added")
                    io.to(socket).emit("sent-request", { message: "User is already added", type: "error" })

                }
            });
        }
    });

    socket.on("accept-request", (data) => {
        const receiver = data.receiver
        const sender = data.sender
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
                const notification_ = notification({
                    user: sender,
                    notification: `${receiverUsername} accepted your friend request`,
                    date: new Date(Date.now()),
                    time: time
                })
                notification_.save()
                // sending notification to contact
                const sockets = getUser(sender)
                for (var i = 0; i <= sockets.length; i++) {
                    io.to(sockets[i]).emit("notification", { notification: notification_, accepted: roomId });
                }
                io.to(socket.id).emit("accepted-request", { message: "Friend request accepted", roomId: roomId, type: "success" })
            });

            // pushNotification(receiver, sender, "accepted your friend request")

        });
    })


    socket.on("get_notification", (user) => {
        console.log(user)
        notifications.findOne({ user: user }).then(function (result) {
            console.log(result)
        });
    });
    // When client disconnects
    socket.on("disconnect", () => {
        console.log("Client Disconnected");
        removeUser(socket.id)
        for (var i = 0; i <= onlineUsers.length; i++) {
            if (onlineUsers[i]) {
                const user__ = JSON.parse(onlineUsers[i]);
                if (user__.socketId === socket.id) {
                    user.findByIdAndUpdate(user__.userId, { isActive: false }, function (err, docs) {
                        if (err) {
                            console.log(err)
                        }
                        else {
                            console.log("Updated!")
                        }
                    });
                }
            }
        }
    });
});



const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "./files/messageImages");
    },
    filename: function (req, file, cb) {
        cb(null, req.userInfo._id + "_" + file.originalname);
    }
});

// filtering file
const filter = function (req, file, cb) {
    if (file.mimetype == 'image/png' || file.mimetype == 'image/jpeg') {
        cb(null, true)
    }
    else {
        cb(null, false)
    }
}

const upload = multer({
    storage: storage
});

const router = new express.Router;


router.post('/send-image-message', auth.verifyUser, upload.single('image'), function (req, res) {
    console.log(req.body)
    // console.log(req.file.path)
    const message_ = message({
        roomId: req.body.roomId,
        message: "Sent an image",
        sentTo: req.body.sentTo,
        sentBy: req.body.sentBy,
        data: req.body.date,
        time: req.body.time,
        image: req.file.path
    });
    message_.save();
    io.to(message_.roomId.toString()).emit("receive_message", message_);

})

app.use(router);


server.listen(90);

module.exports = { io };
module.exports = onlineUsers



