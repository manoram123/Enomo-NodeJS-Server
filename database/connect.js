const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/enomo_chat_database', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});