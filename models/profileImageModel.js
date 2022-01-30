const mongoose = require('mongoose');
const schema = mongoose.Schema;

const userProfileImage = mongoose.model("ProfileImage", {
    image: { type: String },
    profile: { type: schema.Types.ObjectId, ref: 'User' }
})

module.exports = userProfileImage;