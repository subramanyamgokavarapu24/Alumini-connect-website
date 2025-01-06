const mongoose = require("mongoose");

const registrationSchema = new mongoose.Schema({
    registrationNumber: {
        type: String,
        required: true,
        unique: true
    }
});

const ApprovedRegistration = mongoose.model("ApprovedRegistration", registrationSchema);
module.exports = ApprovedRegistration;
