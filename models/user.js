const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose");

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    graduationYear: {
        type: Number,
        required: true
    },
    fieldOfStudy: {
        type: String,
        required: true
    },
    industry: String,
    location: String,
    profilePicture: {
        url: String,
        filename: String
    }, 
    bio: String, 
    dateJoined: {
        type: Date,
        default: Date.now
    },
    posts: [{
        type: mongoose.Schema.Types.ObjectId, ref: 'Post'
    }],
    stories: [{
        type: mongoose.Schema.Types.ObjectId, ref: 'SuccessStory'
    }],
    jobs: [{
        type: mongoose.Schema.Types.ObjectId, ref: 'Job'
    }],
    eventsCreated: [{
        type: mongoose.Schema.Types.ObjectId, ref: 'Event'
    }], // Events created by the user
    eventsRegistered: [{
        type: mongoose.Schema.Types.ObjectId, ref: 'Event'
    }], // Events the user is registered for
    announcementsMade: [{
        type: mongoose.Schema.Types.ObjectId, ref: 'Announcement'
    }] ,// Announcements made by the user
    hasGivenFeedback: {
        type: Boolean,
        default: false
    },
    regno:{
        type:String
    }
    
});

userSchema.plugin(passportLocalMongoose);

const User = mongoose.model("User", userSchema);

module.exports = User;
