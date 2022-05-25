const { path } = require('express/lib/application');
const mongoose = require('mongoose');
const passportlocalmongoose = require('passport-local-mongoose');
const passport = require('passport');
const { string } = require('joi');
const findOrCreate = require("mongoose-findorcreate");
const uniqueValidator = require('mongoose-unique-validator');


const userInfoSchema = new mongoose.Schema({
    fName: {
        type: String,
        // required: true
    },
    lName: {
        type: String,
        // required: true
    },

    username: {
        type: String,
        // required: true,
        unique: true,
        sparse:true,
    },

    mobileNum: {
        type: String,
        // required: true,
        unique: true,
        sparse:true,
    },
    Email: {
        type: String,
        required: true,
        unique: true,
        sparse:true,
    },
     
    // nationalId:{
    //     type: Number,
    //     // required: true,
    //     minlength: 14,
    //     maxlength: 14,
    //     unique: true,
    //     sparse:true,
    // },
    birthDate:{
        type: Date,
        // required:true,
    },

});
userInfoSchema.plugin(passportlocalmongoose , { usernameField: "Email" });
userInfoSchema.plugin(findOrCreate);
uniqueValidator.defaults.message = 'Error, expected {PATH} to be unique.'
userInfoSchema.plugin(uniqueValidator);


const userInfo = mongoose.model('userInfo', userInfoSchema);
module.exports = userInfo;