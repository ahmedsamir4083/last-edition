const { Point } = require('face-api.js');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;





const reportSchema = new Schema({
    label: {
        type: String,
        required: true,
        unique: true,

    },
    fname: {
      type: String,
      required: true,
    },
    lname: {
        type: String,
        required: true,
      },

    age:{
        type: Number,
        required: true,
    },

    gender:{
      type: String,
    },

    subject:{
      type:String
    },

    user:{
      type: Schema.Types.ObjectId,
      ref:"userInfo",
    },
  
    
});

module.exports = mongoose.model("report", reportSchema);