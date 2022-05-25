const passport = require('passport'); 
const { findOne } = require('../models/userInfo');
const userInfo = require('../models/userInfo');


module.exports.home = (req, res) => {
    res.render('home1', {messages: req.flash('success')})
}


module.exports.newuserpage = (req, res) => {
    res.render('index' , {messages: req.flash('error')});
}

module.exports.newuser = async (req, res , next) => {
    const {Email,username, Password} = req.body;
    const user = new userInfo(req.body);
    const registerduser = await userInfo.register(user,Password);
    req.login(registerduser, err => {
        if(err) return next(err);
        res.redirect('/loginpage') 
    })
}

module.exports.loginpage = (req, res) => {
    res.render('loginpage2', {messages: req.flash('error')});
}

module.exports.login = (req, res , next) =>{
req.flash('success', "welcome back!");
res.redirect('/mainpage') 
}

module.exports.mainpage = (req, res) => {
    const user = req.user
    res.render('home2', {messages: req.flash('success'),user})
}

module.exports.feeds = (req, res) => {
    res.render('feeds')
}


module.exports.reportfound = (req, res) => { 
    res.render('report',{messages: req.flash('success')})
}
module.exports.search = (req, res) => {
    res.render('search')
}
module.exports.logout = (req, res)=>{
    req.logout();
    req.flash('success', 'Goodbye!')
    res.redirect('/')
}

