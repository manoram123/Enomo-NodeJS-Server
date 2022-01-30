const express = require('express');
const bcryptjs = require('bcryptjs');
const jsonwebtoken = require('jsonwebtoken');
const router = new express.Router();
const auth = require('../auth/auth')
const user = require('../models/userModel');
const userProfileImage = require('../models/profileImageModel');
const upload = require('../uploads/uploads');
const notification = require('../models/notifications/notifcationModel');
const validator = require('validator');



// route for user registration
router.post('/user/signup', function (req, res) {
    const data = req.body;
    user.findOne({ username: data.username }).then(function (userData) {
        // if username is in database
        if (userData != null) {
            res.json({ message: "Username already taken!", type: 'error' });
            return;
        } else {
            // else new user data can be inserted in the database
            const password = data.password;
            bcryptjs.hash(password, 10, function (e, hashed_pw) {
                const sData = new user({
                    username: data.username,
                    password: hashed_pw,
                    phone: data.phone,
                    address: data.address,
                    email: data.email
                });

                sData.save().then(function () {
                    res.json({ message: "Registered Successfully!", type: "success" })
                }).catch(function (e) {
                    res.json(e)
                });

            });
        }



    });
});


//route for login
router.post("/user/login", function (req, res) {
    const data = req.body;
    user.findOne({ username: data.username }).then(function (userData) {
        // console.log(userData);
        if (userData === null) {
            return res.json({ message: "User does not exists!", type: 'error' })
        }

        //checking password
        const password = data.password;
        bcryptjs.compare(password, userData.password, function (e, result) {
            //if true correct password else incorrect
            if (result === false) {
                return res.json({ message: "Invalid Password!", type: 'error' });
            }
            //ticket generate
            const token = jsonwebtoken.sign({ userId: userData._id, username: userData.username, user: userData, image: userData.image }, "anysecrectkey");
            res.json({ token: token, message: 'Successfully Logged In!', type: 'success' });
        });
    });
});


router.delete("/user/delete/:id", auth.verifyUser, function (req, res) {
    // res.json({ msg: 'deleted!', userPhone: req.userInfo.username });
    const userId = req.params.id;
    user.findByIdAndDelete(userId).then(function () {
        res.json({ "message": "Deleted Successfully" })
    }).catch(function (e) {
        res.json({ message: e })
    });
});

router.get("/user/users", auth.verifyUser, function (req, res) {
    const users = user.find().then(function (data) {
        res.json({ data: data });
    });
});

router.get("/user/:userId", auth.verifyUser, function (req, res) {
    user.findById(req.params.userId).then(function (data) {
        res.json({ data: data });
    });
});

router.post("/set-status-online/:userId", auth.verifyUser, function (req, res) {
    user.findByIdAndUpdate(req.userInfo._id, { isActive: true }, function (err, docs) {
        if (err) {
            console.log(err)
        }
        else {
            console.log("Updated!")
        }
    });
});


router.post("/update-profile", auth.verifyUser, function (req, res) {
    if (req.body.field === 'username') {
        if (req.body.username) {
            user.findOne({ username: req.body.username }).then(function (data) {
                if (data) {
                    res.json({ message: "Username already taken", type: "error" })
                } else {
                    user.findByIdAndUpdate(req.userInfo._id, { username: req.body.username }, function (err, docs) {
                        if (!err) {
                            res.json({ message: "Username changed", type: "success" })
                        }
                    });
                }
            })
        } else {
            res.json({ message: "Invalid Username", type: "error" })
        }

    } else if (req.body.field === 'name') {
        console.log(req.body.firstName)
        console.log(req.body.lastName)

        if (req.body.fullName || req.body.lastName) {
            user.findByIdAndUpdate(req.userInfo._id, { firstName: req.body.firstName, lastName: req.body.lastName }, function (err, docs) {
                if (!err) {
                    res.json({ message: "Name changed", type: "success" })
                }
            });
        } else {
            res.json({ message: "Invalid Name provided", type: "error" })
        }
    } else if (req.body.field === 'email') {
        console.log(req.body.email)
        if (req.body.email && validator.isEmail(req.body.email)) {
            user.findOne({ email: req.body.email }).then(function (data) {
                if (data) {
                    res.json({ message: "Email already taken", type: "error" })
                } else {
                    user.findByIdAndUpdate(req.userInfo._id, { email: req.body.email }, function (err, docs) {
                        if (!err) {
                            res.json({ message: "Email changed", type: "success" })
                        }
                    });
                }
            })
        } else {
            res.json({ message: "Invalid Email", type: "error" })
        }

    } else {
        res.json({ message: "Enter valid credentials", type: "error" })
    }
})

//upload user profile image
router.post("/user/upload-image", auth.verifyUser, upload.single("image"), function (req, res) {
    if (req.file.path == undefined) {
        res.json({ error: "File not found." })
    }
    else {
        // data = req.
        // const newProfile = new userProfileImage({
        //     image: req.file.path,
        //     profile: req.userInfo._id
        // })
        // newProfile.save()
        user.findByIdAndUpdate(req.userInfo._id, { image: req.file.path }, function (error, docs) {
            if (error) {
                console.log(error)
            } else {
                console.log("Updated!")
                res.json({ message: "Profile image updated", type: "success" })
            }
        });
    }
});

router.get("/notifications", auth.verifyUser, function (req, res) {
    notification.find({ user: req.userInfo._id.toString() }).then(function (notifications) {
        if (notifications) {
            res.json({ notifications: notifications });
        }
    })
})



module.exports = router;
