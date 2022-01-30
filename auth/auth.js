const jwt = require('jsonwebtoken');
const user = require('../models/userModel');

module.exports.verifyUser = function (req, res, next) {
    try {
        const token = req.headers.authorization.split(" ")[1];

        const data = jwt.verify(token, "anysecrectkey");
        //console.log(token);
        const client = user.findOne({ _id: data.userId }).then(function (result) {
            // console.log(result);

            // saving this data to request
            req.userInfo = result;
            next();
        }).catch();
    }
    catch (e) {
        console.log(e);
    }

}