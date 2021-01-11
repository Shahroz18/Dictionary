// Used the following website for help with setting up MongoDB and Passport for login authentication
// https://www.geeksforgeeks.org/login-form-using-node-js-and-mongodb/

var express = require("express"),
    mongoose = require("mongoose"),
    passport = require("passport"),
    bodyParser = require("body-parser"),
    LocalStrategy = require("passport-local"),
    passportLocalMongoose =
        require("passport-local-mongoose"),
    https = require("https"),
    User = require("./models/user"),
    Store = require("./models/store");

// Set up MongoDB connection
mongoose.set('useNewUrlParser', true);
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);
mongoose.set('useUnifiedTopology', true);
mongoose.connect("mongodb+srv://shahroz:oaaX5T9HUSuCO4pT@assignments.5nnng.mongodb.net/ccps530finalexam?retryWrites=true&w=majority");

var app = express();
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));

app.use(require("express-session")({
    secret: "ccps 530 web systems",
    resave: false,
    saveUninitialized: false
}));

// Set up Passport for authentication
app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

//===================== 
// ROUTES 
//===================== 

// Showing home page 
app.get("/", function (req, res) {
    res.render("home");
});

// Showing secret page 
app.get("/secret", isLoggedIn, function (req, res) {
    res.render("secret", { msg: "", id: "", def: "", img: "", capt: "" });
});

// Handling secret page search form (API call)
app.post("/secret", isLoggedIn, function (req, res) {
    var req_term = req.body.term;
    Store.findOne({ term: req_term }, function (err, store_data) {
        if (err) {
            console.log("Error: " + err.message);
        }

        // If found in database, use that
        if (store_data) {
            console.log("Database");
            res.render("secret", {
                msg: "",
                id: store_data.data.id,
                def: store_data.data.def,
                img: store_data.data.img,
                capt: store_data.data.capt
            });
        }

        // If not found in database, make API call
        else {
            https.get("https://dictionaryapi.com/api/v3/references/collegiate/json/" + req_term + "?key=3c16841b-7e13-4e03-817a-412792ef7689", (resp) => {
                console.log("API");
                let api_data = "";

                resp.on("data", (chunk) => {
                    api_data += chunk;
                });

                resp.on("end", () => {
                    api_data = JSON.parse(api_data);

                    var api_term, api_def, api_img, api_capt;

                    // Check if word was found and set word name
                    try {
                        api_term = api_data[0].meta.id;
                    } catch (error) {
                        res.render("secret", { msg: "Word not found", id: "", def: "", img: "", capt: "" });
                        return;
                    }

                    // Take numbers off words for formatting
                    if (api_term.includes(":")) {
                        api_term = api_term.substring(0, api_term.length - 2);
                    }

                    // Set word definition, allows different formats of data in API
                    try {
                        api_def = api_data[0].def[0].sseq[0][0][1].dt[0][1];
                    } catch (error) {
                        try {
                            api_def = api_data[0].def[0].sseq[0][0][1][0][1].sense.dt[0][1] + " " + api_data[0].def[0].sseq[0][0][1][1][1].dt[0][1];
                        } catch (error) {
                            api_def = api_data[0].def[0].sseq[0][0][1].sense.dt[0][1] + " " + api_data[0].def[0].sseq[0][1][1].dt[0][1];
                        }
                    }

                    // If there is an image use that, if not use link for default "no image" image
                    try {
                        api_img = "https://www.merriam-webster.com/assets/mw/static/art/dict/" + api_data[0].art.artid + ".gif";
                    } catch (error) {
                        api_img = "https://i.imgur.com/D1nM11A.png";
                    }

                    // If there is a caption use it
                    try {
                        api_capt = "Caption: " + api_data[0].art.capt + "";
                    } catch (error) {
                        api_capt = "";
                    }

                    // Add data from API call to database
                    var newStore = new Store({
                        term: req_term,
                        data: {
                            id: api_term,
                            def: api_def,
                            img: api_img,
                            capt: api_capt
                        }
                    });
                    newStore.save();

                    res.render("secret", {
                        msg: "",
                        id: api_term,
                        def: api_def,
                        img: api_img,
                        capt: api_capt
                    });
                });
            }).on("error", (err) => {
                console.log("Error: " + err.message);
            });
        }
    });
});

// Showing register page 
app.get("/register", function (req, res) {
    res.render("register");
});

// Handling user registration
app.post("/register", function (req, res) {
    var username = req.body.username
    var password = req.body.password
    User.register(new User({ username: username }),
        password, function (err, user) {
            if (err) {
                console.log(err);
                return res.render("register");
            }

            passport.authenticate("local")(
                req, res, function () {
                    res.render("secret", { msg: "", id: "", def: "", img: "", capt: "" });
                });
        });
});

// Showing login page 
app.get("/login", function (req, res) {
    res.render("login");
});

// Handling user login 
app.post("/login", passport.authenticate("local", {
    successRedirect: "/secret",
    failureRedirect: "/login"
}), function (req, res) {
});

// Handling user logout  
app.get("/logout", function (req, res) {
    req.logout();
    res.redirect("/");
});

// Check if user is logged in
function isLoggedIn(req, res, next) {
    if (req.isAuthenticated()) return next();
    res.redirect("/login");
}

var port = process.env.PORT || 3000;
app.listen(port, function () {
    console.log('App listening on port ' + port);
});