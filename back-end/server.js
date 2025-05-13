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
      telugu: { type: String, required: true },
      createdAt: { type: Date, default: Date.now }
    }
  ],
  savedTranslations: [
    {
      english: { type: String, required: true },
      telugu: { type: String, required: true },
      createdAt: { type: Date, default: Date.now }
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

    // Check if this exact translation already exists in history
    const existsInHistory = user.translations.some(
      translation => translation.english === english && translation.telugu === telugu
    );

    if (!existsInHistory) {
      user.translations.unshift({ english, telugu });

      // Keep only the 5 most recent translations
      if (user.translations.length > 5) {
        user.translations = user.translations.slice(0, 5);
      }

      await user.save();
    }

    res.status(200).json({ message: "Translation processed successfully" });
  } catch (err) {
    console.error("Error saving translation:", err);
    res.status(500).json({ message: "Server error while saving translation" });
  }
});

app.post("/save-to-saved", isAuthenticated, async (req, res) => {
  const { english, telugu } = req.body;
  const username = req.session.user.username;

  try {
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if this exact translation already exists in saved
    const existsInSaved = user.savedTranslations.some(
      translation => translation.english === english && translation.telugu === telugu
    );

    if (existsInSaved) {
      return res.status(200).json({ message: "Translation already saved" });
    }

    user.savedTranslations.unshift({ english, telugu });
    await user.save();

    res.status(200).json({ message: "Translation saved to saved list" });
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

    res.json({ translations: user.translations });
  } catch (err) {
    console.error("Error fetching history:", err);
    res.status(500).json({ message: "Server error while fetching history" });
  }
});

app.get("/saved-translations", isAuthenticated, async (req, res) => {
  const username = req.session.user.username;

  try {
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ savedTranslations: user.savedTranslations });
  } catch (err) {
    console.error("Error fetching saved translations:", err);
    res.status(500).json({ message: "Server error while fetching saved translations" });
  }
});

app.delete("/delete-history-item", isAuthenticated, async (req, res) => {
  const { index } = req.body;
  const username = req.session.user.username;

  try {
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (index >= 0 && index < user.translations.length) {
      user.translations.splice(index, 1);
      await user.save();
      return res.json({ message: "History item deleted successfully" });
    }

    return res.status(400).json({ message: "Invalid index" });
  } catch (err) {
    console.error("Error deleting history item:", err);
    res.status(500).json({ message: "Server error while deleting history item" });
  }
});

app.delete("/delete-saved-item", isAuthenticated, async (req, res) => {
  const { index } = req.body;
  const username = req.session.user.username;

  try {
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (index >= 0 && index < user.savedTranslations.length) {
      user.savedTranslations.splice(index, 1);
      await user.save();
      return res.json({ message: "Saved item deleted successfully" });
    }

    return res.status(400).json({ message: "Invalid index" });
  } catch (err) {
    console.error("Error deleting saved item:", err);
    res.status(500).json({ message: "Server error while deleting saved item" });
  }
});

app.delete("/delete-history", isAuthenticated, async (req, res) => {
  const username = req.session.user.username;

  try {
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.translations = [];
    await user.save();

    res.json({ message: "History deleted successfully" });
  } catch (err) {
    console.error("Error deleting history:", err);
    res.status(500).json({ message: "Server error while deleting history" });
  }
});

app.delete("/delete-saved", isAuthenticated, async (req, res) => {
  const username = req.session.user.username;

  try {
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.savedTranslations = [];
    await user.save();

    res.json({ message: "Saved translations deleted successfully" });
  } catch (err) {
    console.error("Error deleting saved translations:", err);
    res.status(500).json({ message: "Server error while deleting saved translations" });
  }
});

app.get("/home", isAuthenticated, (req, res) => {
  res.sendFile(path.resolve(__dirname, "../front-end/index.html"));
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
