// models/Feedback.js
const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    dateSubmitted: { type: Date, default: Date.now },
});

const Feedback = mongoose.model('Feedback', feedbackSchema);
module.exports = Feedback;
