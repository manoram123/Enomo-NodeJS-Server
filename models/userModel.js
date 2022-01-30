const mongoose = require('mongoose');
const schema = mongoose.Schema;

const user = mongoose.model('User', {
    firstName: { type: String, default: '#' },
    lastName: { type: String, default: '#' },
    address: { type: String },
    phone: { type: String },
    email: { type: String },
    username: { type: String },
    password: { type: String },
    isActive: { type: Boolean, default: false },
    image: { type: String },
    rooms: [{ type: schema.Types.ObjectId, ref: 'Room', default: [] }]
});



module.exports = user;