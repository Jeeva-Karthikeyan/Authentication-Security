//jshint esversion:6
require('dotenv').config()
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const md5 = require("md5");

const app = express();

console.log(md5("123456")); 
//The hash that's created is always going to be the same

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
    extended: true
}));

mongoose.connect("mongodb://127.0.0.1:27017/endUSersDB", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true
});

//Set up our new database
//setup new user database
const userSchema = new mongoose.Schema({
    email: String,
    password: String
});



//now we can start creating Users and adding it to this endUserDB
const User = new mongoose.model("User", userSchema);


app.get("/", function (req, res) {
    res.render("home");
});


app.get("/login", function (req, res) {
    res.render("login");
});

app.get("/register", function (req, res) {
    res.render("register");
});

// Inside the callback is where we're going to create our brand new user
app.post("/register", function (req, res) {
    //this is going to be created using that user model here
    const newUser = new User({
        email: req.body.username,
        password: md5(req.body.password) //To turn that into a irreversible hash.
    });

    newUser.save(function (err) {
        if (err) {
            console.log(err);
        } else {
            res.render("secrets");
        }
    })
})

app.post("/login", function (req, res) {
    const username = req.body.username;
    const password = md5(req.body.password);

    // username field comes from the user who's trying to log in 
    // and the email field is the one in our database that's got the saved data
    User.findOne({
            email: username
        }, function (err, foundUser) {
            if (err) {
                console.log(err);
            } else {
                if (foundUser) { //Does that user with that email exist?
                    if (foundUser.password === password) {
                        res.render("secrets")
                }
            }
        }
    });

});


app.get('/logout', function(req, res){
      res.redirect('/');
  });

app.listen(3000, function () {
    console.log("Server started on port 30000");
});