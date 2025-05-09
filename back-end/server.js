const express = require("express");
const session = require("express-session");
const path = require("path");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const rateLimit = require("express-rate-limit");
const logger = require("./logger");
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
  translations: [
    {
      english: { type: String, required: true },
      telugu: { type: String, required: true }
    }
  ]
});

const User = mongoose.model("users", UserSchema);

app.use(cookieParser());
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      maxAge: 1000 * 60 * 60
    },
  })
);

app.use(logger);

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

app.get("/", (req, res) => {
  return res.redirect("/login");
});

app.get("/login", (req, res) => {
  if (req.session.user)
    return res.redirect("/home");

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
      return res.status(400).json({ message: "User already exists. Please log in or use a different username" });
    }

    await User.create({ username, password: hashedPassword });
    res.status(201).json({ message: "User created" });
  } catch (err) {
    res.status(500).json({ message: "Server error during signup." });
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required." });
  }

  try {
    const user = await User.findOne({ username });

    if (user && await bcrypt.compare(password, user.password)) {
      req.session.user = { username };
      return res.json({ message: "Login successful" });
    } else {
      return res.status(401).json({ message: "Invalid username or password" });
    }
  }
  catch (err) {
    console.error("Error during login:", err);
    res.status(500).json({ message: "Server error during login" });
  }
});

app.post("/save-translation", isAuthenticated, async (req, res) => {
  const { english, telugu } = req.body;
  const username = req.session.user.username;

  try {
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const exists = user.translations.some(
      (translation) => translation.english === english || translation.telugu === telugu
    );

    if (exists) {
      return res.status(200).json({ message: "Translation already exists" });
    }

    user.translations.unshift({ english, telugu });

    if (user.translations.length > 5) {
      user.translations.pop();
    }

    await user.save();
    res.status(200).json({ message: "Translation saved successfully" });
  } catch (err) {
    console.error("Error saving translation:", err);
    res.status(500).json({ message: "Server error while saving translation" });
  }
});

app.get('/current-user', (req, res) => {
  if (req.session.user) {
    res.json({ username: req.session.user.username });
  } else {
    res.json({ username: null });
  }
});

app.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: "Error logging out" });
    }

    res.clearCookie('connect.sid');
    res.json({ message: "Logged out successfully" });
  });
});

app.get("/history", isAuthenticated, async (req, res) => {
  const username = req.session.user.username;

  try {
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const lastFiveTranslations = user.translations.slice(0, 5);

    res.json({ translations: lastFiveTranslations });
  } catch (err) {
    console.error("Error fetching history:", err);
    res.status(500).json({ message: "Server error while fetching history" });
  }
});

app.delete("/delete-history", isAuthenticated, async (req, res) => {
  const username = req.session.user ? req.session.user.username : null;

  if (!username) {
    return res.status(400).json({ message: "No user logged in" });
  }

  try {
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (user.translations && user.translations.length > 0) {
      user.translations = [];
      const result = await user.save();

      res.json({ message: "History (translations) deleted successfully" });
    } else {
      res.status(400).json({ message: "No translations to delete." });
    }
  } catch (err) {
    console.error("Error deleting history:", err);
    if (err instanceof mongoose.Error.ValidationError) {
      res.status(400).json({ message: "Validation error during deletion." });
    } else if (err instanceof mongoose.Error.CastError) {
      res.status(400).json({ message: "Invalid data type in the request." });
    } else {
      res.status(500).json({ message: "Error deleting translations." });
    }
  }
});

app.get("/home", isAuthenticated, (req, res) => {
  res.sendFile(path.resolve(__dirname, "../front-end/index.html"));
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});