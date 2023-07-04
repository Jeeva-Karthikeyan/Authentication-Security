//jshint esversion:6
require('dotenv').config()
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");

const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
    extended: true
}));

//Set up our Session
app.use(session({
    secret: "Our little secret.",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
//Passport for managing session
app.use(passport.session());

mongoose.connect("mongodb://127.0.0.1:27017/endUSersDB", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true
});

//Set up our new database
//setup new user database
const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String
});

//This is what we're going to use to hash and salting our passwords and to save our users into our MongoDB database.
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
//now we can start creating Users and adding it to this endUserDB
const User = new mongoose.model("User", userSchema);

//Its going to be the local strategy to authenticate users using their username and password serialize and deserialize
//Serialize and deserialize is only necessary when we're using sessions
//Serialize ; creates fortune cookie and stuffs the message namely our users identifications into the cookie
//Deserialize : Allow Passport to be able to crumble the cookie and discover the message inside which is who this user is!
passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
    done(null, user.id);
});

passport.deserializeUser(function(id , done) {
    User.findById(id, function(err, user) {
        done(err, user);
    });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));


app.get("/", function (req, res) {
    res.render("home");
});

app.get('/auth/google',
  passport.authenticate('google', { scope: ["profile"] })
  );

app.get("/auth/google/secrets", 
    passport.authenticate("google", { failureRedirect: "/login" }),
    function(req, res) {
        // Successful authentication, redirect to secrets.
        res.redirect("/secrets");
});

app.get("/login", function (req, res) {
    res.render("login");
});

app.get("/register", function (req, res) {
    res.render("register");
});

app.get("/secrets", function(req, res) {
    //check if the user is authenticated and this is where we're relying on passport, session, passport-local,p-l-m
    //nake sure that if a user is alreay logged in then we should simply  render secrets
    if(req.isAuthenticated()){
        res.render("secrets");
    } else {
        res.redirect("/login");
    }
});

app.get("/logout", function(req, res){
    req.session.destroy();
    res.redirect("/");
});

// Inside the callback is where we're going to create our brand new user
app.post("/register", function (req, res) {
    // This method comes from the passport-local-mongoose package
    // that we can avoid creating our new userSchema, saving our user and interacting with mongoose directly
    User.register({username: req.body.username}, req.body.password, function(err, User) {
        if(err) {
            console.log(err);
            res.redirect("/register");
        } else {
            // cookie has a few pieces of information that tells our server about the user, namely that they are authorized
            passport.authenticate("local")(req, res, function(){ //authentication was successful & we managed to successfully setup a cookie that saved their current logged in session
                res.redirect("/secrets");
            });
        }
    });
});

app.post("/login", function (req, res) {
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });

    req.login(user, function(err) {
        if (err) {
            console.log(err);
        } else {
            passport.authenticate("local")(req, res, function(){ 
                res.redirect("/secrets");
            });
        }
    });
});


app.listen(3000, function () {
    console.log("Server started on port 30000");
});