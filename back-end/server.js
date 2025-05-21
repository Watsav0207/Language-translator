const express = require("express");
const session = require("express-session");
const path = require("path");
const cookieParser = require("cookie-parser");
const bcrypt = require('bcryptjs');
const rateLimit = require("express-rate-limit");
const logger = require("./logger");
const mongoose = require("mongoose");
const MongoStore = require('connect-mongo');
require("dotenv").config();

// Express app setup
const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// MongoDB connection
mongoose.connect(process.env.MONGO_URL)
  .then(() => {
    console.log("Connected to MongoDB!");
  })
  .catch(err => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

// Mongoose schema and model
const UserSchema = new mongoose.Schema({
  username: String,
  password: String,
  translations: [
    {
      english: { type: String, required: true },
      telugu: { type: String, required: true },
      createdAt: { type: Date, default: Date.now },
    }
  ],
  savedTranslations: [
    {
      english: { type: String, required: true },
      telugu: { type: String, required: true },
      createdAt: { type: Date, default: Date.now },
    }
  ]
});

const User = mongoose.model("users", UserSchema);

// Middleware
app.use(cookieParser());
app.use(express.json());
app.use(express.static(path.resolve(__dirname, "../front-end")));

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URL,
      ttl: 14 * 24 * 60 * 60 // = 14 days
    }),
    cookie: {
      secure: isProduction,
      maxAge: 1000 * 60 * 60,
      sameSite: isProduction ? 'none' : 'lax'
    }
  })
);

if (isProduction) {
  app.set('trust proxy', 1);
}

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 100 : 1000,
  message: "Too many requests from this IP, please try again later.",
});
app.use(limiter);

// Custom logger
app.use(logger);

// Authentication middleware
function isAuthenticated(req, res, next) {
  if (req.session.user) return next();
  res.status(401).json({ message: "Unauthorized" });
}

// Routes
app.get("/", (req, res) => {
  res.redirect("/login");
});

app.get("/login", (req, res) => {
  if (req.session.user) return res.redirect("/home");
  res.sendFile(path.resolve(__dirname, "../front-end/login.html"));
});

app.get("/signup", (req, res) => {
  if (req.session.user) return res.redirect("/home");
  res.sendFile(path.resolve(__dirname, "../front-end/signup.html"));
});

app.post("/signup", async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required." });
  }

  try {
    const userExists = await User.findOne({ username });
    if (userExists) {
      return res.status(400).json({ message: "User already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await User.create({ username, password: hashedPassword });
    res.status(201).json({ message: "User created successfully" });
  } catch (err) {
    console.error("Signup error:", err);
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
      return res.status(401).json({ message: "Invalid credentials" });
    }
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error during login" });
  }
});

app.get("/current-user", (req, res) => {
  if (req.session.user) {
    res.json({ username: req.session.user.username });
  } else {
    res.json({ username: null });
  }
});

app.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: "Error logging out" });
    }
    res.clearCookie("connect.sid");
    res.json({ message: "Logged out successfully" });
  });
});

// Translation routes
app.post("/save-translation", isAuthenticated, async (req, res) => {
  const { english, telugu } = req.body;
  const username = req.session.user.username;

  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ message: "User not found" });

    const existsInHistory = user.translations.some(
      t => t.english === english && t.telugu === telugu
    );

    if (!existsInHistory) {
      user.translations.unshift({ english, telugu });
      if (user.translations.length > 5) {
        user.translations = user.translations.slice(0, 5);
      }
      await user.save();
    }

    res.json({ message: "Translation saved to history" });
  } catch (err) {
    console.error("Error saving translation:", err);
    res.status(500).json({ message: "Server error saving translation" });
  }
});

app.post("/save-to-saved", isAuthenticated, async (req, res) => {
  const { english, telugu } = req.body;
  const username = req.session.user.username;

  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ message: "User not found" });

    const existsInSaved = user.savedTranslations.some(
      t => t.english === english && t.telugu === telugu
    );

    if (existsInSaved) {
      return res.status(200).json({ message: "Translation already saved" });
    }

    user.savedTranslations.unshift({ english, telugu });
    await user.save();
    res.json({ message: "Translation saved" });
  } catch (err) {
    console.error("Error saving translation:", err);
    res.status(500).json({ message: "Server error saving translation" });
  }
});

// History routes
app.get("/history", isAuthenticated, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.session.user.username });
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ translations: user.translations });
  } catch (err) {
    console.error("Error fetching history:", err);
    res.status(500).json({ message: "Server error fetching history" });
  }
});

app.get("/saved-translations", isAuthenticated, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.session.user.username });
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ savedTranslations: user.savedTranslations });
  } catch (err) {
    console.error("Error fetching saved translations:", err);
    res.status(500).json({ message: "Server error fetching saved translations" });
  }
});

// Delete routes
app.delete("/delete-history-item", isAuthenticated, async (req, res) => {
  const { index } = req.body;
  try {
    const user = await User.findOne({ username: req.session.user.username });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (index >= 0 && index < user.translations.length) {
      user.translations.splice(index, 1);
      await user.save();
      return res.json({ message: "Item deleted" });
    }
    res.status(400).json({ message: "Invalid index" });
  } catch (err) {
    console.error("Error deleting history item:", err);
    res.status(500).json({ message: "Server error deleting item" });
  }
});

app.delete("/delete-saved-item", isAuthenticated, async (req, res) => {
  const { index } = req.body;
  try {
    const user = await User.findOne({ username: req.session.user.username });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (index >= 0 && index < user.savedTranslations.length) {
      user.savedTranslations.splice(index, 1);
      await user.save();
      return res.json({ message: "Item deleted" });
    }
    res.status(400).json({ message: "Invalid index" });
  } catch (err) {
    console.error("Error deleting saved item:", err);
    res.status(500).json({ message: "Server error deleting item" });
  }
});

app.delete("/delete-history", isAuthenticated, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.session.user.username });
    if (!user) return res.status(404).json({ message: "User not found" });

    user.translations = [];
    await user.save();
    res.json({ message: "History cleared" });
  } catch (err) {
    console.error("Error clearing history:", err);
    res.status(500).json({ message: "Server error clearing history" });
  }
});

app.delete("/delete-saved", isAuthenticated, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.session.user.username });
    if (!user) return res.status(404).json({ message: "User not found" });

    user.savedTranslations = [];
    await user.save();
    res.json({ message: "Saved translations cleared" });
  } catch (err) {
    console.error("Error clearing saved translations:", err);
    res.status(500).json({ message: "Server error clearing saved translations" });
  }
});

// Main app route
app.get("/home", isAuthenticated, (req, res) => {
  res.sendFile(path.resolve(__dirname, "../front-end/index.html"));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something went wrong!" });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "healthy" });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${isProduction ? 'Production' : 'Development'}`);
});