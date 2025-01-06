const mongoose = require('mongoose');

// Define the conversation schema
const conversationSchema = new mongoose.Schema({
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Users participating in the conversation
    messages: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Message' }], // Messages exchanged in the conversation
    lastUpdated: { type: Date, default: Date.now } // Timestamp of the last update
});

// Create and export the Conversation model
const Conversation = mongoose.model('Conversation', conversationSchema);
module.exports = Conversation;
