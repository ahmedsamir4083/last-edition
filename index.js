if(process.env.NODE_ENV !== "production"){
    require('dotenv').config();
}

const express = require('express');
const app = express();
const path = require('path');
const morgan = require('morgan');
const mongoose = require('mongoose');
const userInfo = require('./models/userInfo');
const Joi = require('joi');
const {userschema} = require('./schemas.js')
// const req = require('express/lib/request');
// const res = require('express/lib/response');
const AsyncErrors = require('./helpers/AsyncErrors');
const ExpressErrors = require('./helpers/ExpressErrors');
const {isloggedin} = require('./helpers/auth');
const passport = require('passport'); 
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');
const flash = require('connect-flash');
const usercontrol = require('./controllers/usercontrol');
const { Router } = require('express');
const MongoDBStore = require('connect-mongodb-session')(session);
const Facebookstrategy = require('passport-facebook').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require("mongoose-findorcreate");
const { profile, error } = require('console');
const { ifError } = require('assert');
const faceapi = require("face-api.js");
const { Canvas, Image } = require("canvas");
const canvas = require("canvas");
const FaceModel = require('./db-model/facedbmodel');
const reportmodel = require('./db-model/reportmodel')
const multer  = require('multer')
const {storage} = require('./cloudinary');
const upload = multer({ storage})
const { v4: uuid } = require('uuid');
faceapi.env.monkeyPatch({ Canvas, Image });
// 'mongodb://localhost:27017/userdb'

// Database connection.
const dbUrl = process.env.dburl;

mongoose.connect( dbUrl, { 
    useNewUrlParser: true, 
    useUnifiedTopology: true
})
    .then(() => {
        console.log("MONGO CONNECTION OPEN!!!")
    })
    .catch(err => {
        console.log("OH NO MONGO CONNECTION ERROR!!!!")
        console.log(err)
    })



// const store = new MongoDBStore({
//     url: dbUrl,
//     secret: 'thisshouldbeabettersecret',
//     touchAfter: 24 * 60 * 60
// })

// store.on("error",function(e){
//     console.log("session error",e)  
// })

const sessionConfig = {
    // store,
    name:'session',
    secret: 'thisshouldbeabettersecret',
    resave: false,
    saveUninitialized : true,
    cookie:{
        httpOnly:true,  
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
        maxAge: 1000 * 60 * 60 * 24 * 7
    }
}


app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/public'));
app.use(express.urlencoded({ extended: true }));
// app.use(morgan('tiny'));
app.use(session(sessionConfig));
app.use(flash());


app.use(passport.initialize());
app.use(passport.session()); 
passport.use(userInfo.createStrategy()); 
passport.serializeUser(userInfo.serializeUser());
passport.deserializeUser(userInfo.deserializeUser());

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: 'https://desolate-badlands-43727.herokuapp.com/auth/google/callback',
    scope: [ 'profile' ],
    state: true
  },
  function(accessToken, refreshToken, profile, cb) {
    userInfo.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

const uservalidator =(req, res, next)=>{
const {error} = userschema.validate(req.body);
if(error){
    // const message=(error.message);
    // req.flash('error', message);
    // res.redirect('/newuser');
    const msg = error.details.map(el =>el.message).join(',')
    throw new ExpressErrors(msg,400);
} else{
    next();
}
}

async function LoadModels() {
  // Load the models
  // __dirname gives the root directory of the server
  await faceapi.nets.faceRecognitionNet.loadFromDisk(__dirname + "/ai_models");
  await faceapi.nets.faceLandmark68Net.loadFromDisk(__dirname + "/ai_models");
  await faceapi.nets.ssdMobilenetv1.loadFromDisk(__dirname + "/ai_models");
}
LoadModels();


async function uploadLabeledImages(images, label, url,filename) {
  try {

    const descriptions = [];
    // Loop through the images
    for (let i = 0; i < images.length; i++) {
      const img = await canvas.loadImage(images[i]);
      // Read each face and save the face descriptions in the descriptions array
      const detections = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
      descriptions.push(detections.descriptor);
    }

    // Create a new face document with the given label and save it in DB
    const createFace = new FaceModel({
      label: label,
      descriptions: descriptions,
      imagedata:[
        {
         url: url,
         filename: filename,
        }
      ]
    });
    await createFace.save(); 
    return true;
  } catch (error) {
    console.log(error);
    return (error);
  }
}


app.get('/',usercontrol.home )

app.route('/newuser')
.get(usercontrol.newuserpage)
.post(uservalidator,AsyncErrors( usercontrol.newuser))


app.get('/loginpage', usercontrol.loginpage)

app.post('/login',passport.authenticate('local', {failureRedirect: '/loginpage', failureFlash: 'Invalid Email or password.'}) ,usercontrol.login) 

app.get('/login/google', passport.authenticate('google'));

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] }));

app.get('/auth/google/callback', 
passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/mainpage');
  });

app.get('/mainpage', isloggedin, usercontrol.mainpage)

app.get('/profile', async (req, res, next)=>{
  const user = req.user
  res.render('profile', {user} );

})

app.get('/profile/:id', async (req, res, next)=>{
  const id = req.params.id;
  const user = await userInfo.findById(id)
  res.render('profileShow', {user} );

})

app.get('/feeds', isloggedin, usercontrol.feeds)

app.get('/report/found', isloggedin, usercontrol.reportfound)

app.post("/report/found",isloggedin,upload.single('File1'),async (req,res)=>{
  const File1= req.file.path;
  const label = uuid();
  const url = req.file.path
  const filename = req.file.filename
  const fname = req.body.fname;
  const lname = req.body.lname;
  const age = req.body.age;
  const gender = req.body.gender;
  const subject =req.body.subject;
  const {id} = req.user;
  let result = await uploadLabeledImages([File1], label,url,filename);
  const report = new reportmodel({
    label:label,
    fname:fname,
    lname:lname,
    age:age,
    gender:gender,
    subject:subject,
    user:id,
  });
  report.save();
  if(result){
    req.flash('success',"Case Has Been Added!")
    res.redirect('/report/found')
  }else{
    res.json({message:"Something went wrong, please try again."})

  }
})

async function getDescriptorsFromDB(image) {
  // Get all the face data from mongodb and loop through each of them to read the data
  let faces = await FaceModel.find();
  for (i = 0; i < faces.length; i++) {
    // Change the face data descriptors from Objects to Float32Array type
    for (j = 0; j < faces[i].descriptions.length; j++) {
      faces[i].descriptions[j] = new Float32Array(Object.values(faces[i].descriptions[j]));
    }
    // Turn the DB face docs to
    faces[i] = new faceapi.LabeledFaceDescriptors(faces[i].label, faces[i].descriptions);
  }

  // Load face matcher to find the matching face
  const faceMatcher = new faceapi.FaceMatcher(faces, 0.6);

  // Read the image using canvas or other method
  const img = await canvas.loadImage(image);
  let temp = faceapi.createCanvasFromMedia(img);
  // Process the image for the model
  const displaySize = { width: img.width, height: img.height };
  faceapi.matchDimensions(temp, displaySize);

  // Find matching faces
  const detections = await faceapi.detectAllFaces(img).withFaceLandmarks().withFaceDescriptors();
  const resizedDetections = faceapi.resizeResults(detections, displaySize);
  const results = resizedDetections.map((d) => faceMatcher.findBestMatch(d.descriptor));
  return results;
}

app.get('/search', isloggedin, usercontrol.search)

app.get('/Isearch' ,(req,res)=>{
res.render('Isearch')
})
app.post("/Isearch",isloggedin,upload.single('File1'), async (req, res) => {

  const File1 = req.file.path;
  let result = await getDescriptorsFromDB(File1);
  const img_id = result.map(f=>(f.label))
  let Fdata = await FaceModel.find({ "label": `${img_id}` })
  let Rdata = await reportmodel.find({ "label": `${img_id}` })
  let Udata = await userInfo.findById(Rdata.map(i=>(i.user)))
  res.render('show',{ Fdata , Rdata , Udata} )

});

// app.get('/fullpost',async(req,res)>={

// })

app.get('/logout', usercontrol.logout)




 
app.all('*' , (req , res , next) =>{
     next(new ExpressErrors('Page Is Not Found' , 404))
})

app.use((err, req , res, next) =>{
    const { statusCode = 500, message = "Something Went Wrong" } = err;
    res.status(statusCode);
    req.flash('error', message);
    res.redirect('/newuser');
})

const port = process.env.PORT || 3000;
app.listen(port, ()=>{
    console.log(`serving on port ${port}`)
} )