const express = require("express");
const session = require("express-session");
const path = require("path");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const rateLimit = require("express-rate-limit");
const  logger = require("./logger");
require("dotenv").config();


const app = express();
const PORT = process.env.PORT || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET;
const MONGO_URL = process.env.MONGO_URL;


mongoose.connect(MONGO_URL)
  .then(() => {
    console.log("Connected to MongoDB!");
  })
  .catch(err => {
    console.error("MongoDB connection error:", err);
  });


const UserSchema = new mongoose.Schema({
  username: String,
  password: String,
});

const User = mongoose.model("users", UserSchema);

app.use(cookieParser());
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false },
  })
);

app.use(logger)

app.use(express.json());
app.use(express.static(path.resolve(__dirname, "../front-end")));


const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100, 
    message: "Too many requests from this IP, please try again later.",
  });
  

app.use(limiter);

function isAuthenticated(req, res, next) {
  if (req.session.user) return next();
  res.redirect("/login");
}


app.get(["/login", "/"], (req, res) => {
  res.sendFile(path.resolve(__dirname, "../front-end/login.html"));
});

app.get("/signup", (req, res) => {
    
    if (req.session.user) {
        return res.redirect("/home");
    } 
  res.sendFile(path.resolve(__dirname, "../front-end/signup.html"));
});

app.post("/signup", async (req, res) => {
    const { username, password } = req.body;
  
    const hashedPassword = await bcrypt.hash(password, 10);
  
    try {
      const userExists = await User.findOne({ username });
      if (userExists) {
        return res.status(400).json({ message: "User already exists.Please log in or use different username" });
      }
  
      await User.create({ username, password: hashedPassword });
      res.status(201).json({ message: "User created" });
    } catch (err) {
      res.status(500).json({ message: "Server error during signup." });
    }
  
  });

  app.post("/login", async (req, res) => {
    const { username, password } = req.body;
  
    try {
      const user = await User.findOne({ username });
  
      if (user && await bcrypt.compare(password, user.password)) {
        req.session.user = { username };
        return res.json({ message: "Login successful" });
      } else {
        return res.status(401).json({ message: "Invalid username or password" });
      }
    } catch (err) {
      res.status(500).json({ message: "Server error during login." });
    }
  });
  
app.get("/home", isAuthenticated, (req, res) => {
  res.sendFile(path.resolve(__dirname, "../front-end/index.html"));
});

app.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ message: "Failed to log out" });
    res.redirect("/login");
  });
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);

});
