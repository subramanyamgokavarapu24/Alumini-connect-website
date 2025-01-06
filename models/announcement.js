// models/Announcement.js
const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
    title: String,
    content: String,
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Announcement', announcementSchema);
