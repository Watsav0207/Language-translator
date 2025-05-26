const express = require("express");
const session = require("express-session");
const path = require("path");
const cookieParser = require("cookie-parser");
const bcrypt = require('bcryptjs');
const rateLimit = require("express-rate-limit");
const logger = require("./logger");
const mongoose = require("mongoose");
const MongoStore = require('connect-mongo');
const csurf = require('csurf');
const helmet = require('helmet');

require("dotenv").config();

// Express app setup
const app = express();
const PORT = process.env.PORT || 10000;
const isProduction = process.env.NODE_ENV === 'production';

// Debug environment variables
console.log("Environment check:");
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("MONGO_USERNAME:", process.env.MONGO_USERNAME ? "Set" : "Not set");
console.log("MONGO_PASSWORD:", process.env.MONGO_PASSWORD ? "Set" : "Not set");
console.log("MONGO_CLUSTER:", process.env.MONGO_CLUSTER ? "Set" : "Not set");
console.log("MONGO_DB:", process.env.MONGO_DB ? "Set" : "Not set");
console.log("SESSION_SECRET:", process.env.SESSION_SECRET ? "Set" : "Not set");

// Improved MongoDB connection
const connectDB = async () => {
  try {
    // Use environment variables with fallbacks (TEMPORARY - set proper env vars in Render)
    const username = process.env.MONGO_USERNAME || "admin";
    const password = process.env.MONGO_PASSWORD || "Ar@020407";
    const cluster = process.env.MONGO_CLUSTER || "cluster0.y33awui.mongodb.net";
    const dbName = process.env.MONGO_DB || "translatorDB";
    const options = process.env.MONGO_OPTIONS || 'retryWrites=true&w=majority';

    console.log("MongoDB config check:");
    console.log("Username:", username ? "✓" : "✗");
    console.log("Password:", password ? "✓" : "✗");
    console.log("Cluster:", cluster ? "✓" : "✗");
    console.log("Database:", dbName ? "✓" : "✗");

    // Validate inputs to avoid 'undefined' errors
    if (!username || !password || !cluster || !dbName) {
      console.error("Missing environment variables:");
      console.error("MONGO_USERNAME:", username);
      console.error("MONGO_PASSWORD:", password ? "[HIDDEN]" : "undefined");
      console.error("MONGO_CLUSTER:", cluster);
      console.error("MONGO_DB:", dbName);
      throw new Error("Missing MongoDB configuration in environment variables.");
    }

    const encodedPassword = encodeURIComponent(password);

    const mongoUrl = `mongodb+srv://${username}:${encodedPassword}@${cluster}/${dbName}?${options}`;

    console.log("Attempting MongoDB connection...");

    await mongoose.connect(mongoUrl);

    console.log("Connected to MongoDB successfully!");
    return mongoUrl; // Return the URL for session store
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    console.error("Error details:", err);
    process.exit(1);
  }
};

// Mongoose schema and model
const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
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

// Initialize the app after DB connection
const initializeApp = async () => {
  // Connect to database first
  const mongoUrl = await connectDB();

  // Middleware
  app.use(cookieParser());
  app.use(express.json());
  app.use(helmet());
  app.use(express.urlencoded({ extended: true }));
  app.use(express.static(path.resolve(__dirname, "../front-end")));

  // Session configuration - now with proper MongoDB connection
  app.use(
    session({
      secret: process.env.SESSION_SECRET || 'fallback_secret_please_change',
      resave: false,
      saveUninitialized: false,
      store: MongoStore.create({
        mongoUrl: mongoUrl, // Use the mongoUrl instead of client
        ttl: 14 * 24 * 60 * 60,
        autoRemove: 'native'
      }),
      cookie: {
        secure: isProduction,
        maxAge: 1000 * 60 * 60 * 24, // Extended to 24 hours
        sameSite: isProduction ? 'none' : 'lax',
        httpOnly: true
      }
    })
  );

  // CSRF protection after session
  app.use(csurf());

  // Always set trust proxy if in production
  if (isProduction) {
    app.set('trust proxy', 1);
  }

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isProduction ? 100 : 1000,
    message: "Too many requests from this IP, please try again later.",
    headers: true
  });
  app.use(limiter);

  // Custom logger
  app.use(logger);

  // Authentication middleware
  function isAuthenticated(req, res, next) {
    if (req.session.user && req.session.user.username) {
      return next();
    }
    res.status(401).json({ 
      message: "Unauthorized",
      error: "Please login to access this resource"
    });
  }

  // Routes - Root route always redirects to login first
  app.get("/", (req, res) => {
    res.redirect("/login");
  });

  // Protected home route - requires authentication
  app.get("/home", isAuthenticated, (req, res) => {
    res.sendFile(path.resolve(__dirname, "../front-end/index.html"));
  });

  // Login page route
  app.get("/login", (req, res) => {
    if (req.session.user) {
      return res.redirect("/home");
    }
    res.sendFile(path.resolve(__dirname, "../front-end/login.html"));
  });

  // Signup page route
  app.get("/signup", (req, res) => {
    if (req.session.user) {
      return res.redirect("/home");
    }
    res.sendFile(path.resolve(__dirname, "../front-end/signup.html"));
  });

  // Signup route
  app.post("/signup", async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ 
        message: "Username and password are required.",
        error: "validation_error"
      });
    }

    try {
      const userExists = await User.findOne({ username });
      if (userExists) {
        return res.status(409).json({ 
          message: "User already exists.",
          error: "user_exists"
        });
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      const newUser = await User.create({ username, password: hashedPassword });
      
      console.log("User created successfully:", username);
      
      return res.status(201).json({ 
        message: "User created successfully",
        success: true
      });
    } catch (err) {
      console.error("Signup error:", err);
      return res.status(500).json({ 
        message: "Server error during signup.",
        error: "server_error"
      });
    }
  });

  // Login route
  app.post("/login", async (req, res) => {
    const { username, password } = req.body;
    
    console.log("Login attempt for:", username);

    if (!username || !password) {
      return res.status(400).json({ 
        message: "Username and password are required.",
        error: "validation_error"
      });
    }

    try {
      const user = await User.findOne({ username });
      console.log("User found:", user ? "yes" : "no");

      if (user && await bcrypt.compare(password, user.password)) {
        // Set the session data
        req.session.user = { 
          username: user.username,
          id: user._id.toString()
        };
        
        // Save the session explicitly
        req.session.save((err) => {
          if (err) {
            console.error("Session save error:", err);
            return res.status(500).json({
              message: "Error creating session",
              error: "session_error"
            });
          }
          
          console.log("Login successful for:", username);
          return res.json({ 
            message: "Login successful",
            success: true
          });
        });
      } else {
        console.log("Invalid credentials for:", username);
        return res.status(401).json({ 
          message: "Invalid credentials",
          error: "auth_error"
        });
      }
    } catch (err) {
      console.error("Login error:", err);
      return res.status(500).json({ 
        message: "Server error during login",
        error: "server_error"
      });
    }
  });

  // Current user route
  app.get("/current-user", (req, res) => {
    if (req.session.user) {
      res.json({ 
        username: req.session.user.username,
        authenticated: true
      });
    } else {
      res.json({ 
        username: null,
        authenticated: false
      });
    }
  });

  // Logout route
  app.post("/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ 
          message: "Error logging out",
          error: "server_error"
        });
      }
      res.clearCookie("connect.sid");
      res.json({ 
        message: "Logged out successfully",
        success: true
      });
    });
  });

  // Translation functionality routes
  app.post("/save-translation", isAuthenticated, async (req, res) => {
    const { english, telugu } = req.body;
    
    if (!english || !telugu) {
      return res.status(400).json({ message: "Both English and Telugu text are required" });
    }

    try {
      const user = await User.findOne({ username: req.session.user.username });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      user.translations.push({ english, telugu });
      await user.save();
      
      res.json({ message: "Translation saved to history" });
    } catch (err) {
      console.error("Error saving translation:", err);
      res.status(500).json({ message: "Error saving translation" });
    }
  });

  app.post("/save-to-saved", isAuthenticated, async (req, res) => {
    const { english, telugu } = req.body;
    
    if (!english || !telugu) {
      return res.status(400).json({ message: "Both English and Telugu text are required" });
    }

    try {
      const user = await User.findOne({ username: req.session.user.username });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      user.savedTranslations.push({ english, telugu });
      await user.save();
      
      res.json({ message: "Translation saved to saved list" });
    } catch (err) {
      console.error("Error saving translation:", err);
      res.status(500).json({ message: "Error saving translation" });
    }
  });

  app.get("/history", isAuthenticated, async (req, res) => {
    try {
      const user = await User.findOne({ username: req.session.user.username });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ translations: user.translations.reverse() });
    } catch (err) {
      console.error("Error fetching history:", err);
      res.status(500).json({ message: "Error fetching history" });
    }
  });

  app.get("/saved-translations", isAuthenticated, async (req, res) => {
    try {
      const user = await User.findOne({ username: req.session.user.username });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ savedTranslations: user.savedTranslations.reverse() });
    } catch (err) {
      console.error("Error fetching saved translations:", err);
      res.status(500).json({ message: "Error fetching saved translations" });
    }
  });

  app.delete("/delete-history-item", isAuthenticated, async (req, res) => {
    const { index } = req.body;
    
    try {
      const user = await User.findOne({ username: req.session.user.username });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      user.translations.splice(index, 1);
      await user.save();
      
      res.json({ message: "History item deleted successfully" });
    } catch (err) {
      console.error("Error deleting history item:", err);
      res.status(500).json({ message: "Error deleting history item" });
    }
  });

  app.delete("/delete-saved-item", isAuthenticated, async (req, res) => {
    const { index } = req.body;
    
    try {
      const user = await User.findOne({ username: req.session.user.username });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      user.savedTranslations.splice(index, 1);
      await user.save();
      
      res.json({ message: "Saved item deleted successfully" });
    } catch (err) {
      console.error("Error deleting saved item:", err);
      res.status(500).json({ message: "Error deleting saved item" });
    }
  });

  app.delete("/delete-history", isAuthenticated, async (req, res) => {
    try {
      const user = await User.findOne({ username: req.session.user.username });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      user.translations = [];
      await user.save();
      
      res.json({ message: "History deleted successfully" });
    } catch (err) {
      console.error("Error deleting history:", err);
      res.status(500).json({ message: "Error deleting history" });
    }
  });

  app.delete("/delete-saved", isAuthenticated, async (req, res) => {
    try {
      const user = await User.findOne({ username: req.session.user.username });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      user.savedTranslations = [];
      await user.save();
      
      res.json({ message: "Saved translations deleted successfully" });
    } catch (err) {
      console.error("Error deleting saved translations:", err);
      res.status(500).json({ message: "Error deleting saved translations" });
    }
  });

  // Health check endpoint
  app.get("/health", async (req, res) => {
    try {
      await mongoose.connection.db.admin().ping();
      res.status(200).json({ 
        status: "healthy",
        database: "connected",
        timestamp: new Date()
      });
    } catch (err) {
      res.status(503).json({ 
        status: "unhealthy",
        database: "disconnected",
        error: err.message
      });
    }
  });

  // Error handling middleware
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
      message: "Something went wrong!",
      error: err.message,
      stack: isProduction ? undefined : err.stack
    });
  });

  // Start server
  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${isProduction ? 'Production' : 'Development'}`);
  });

  // Error handlers
  process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err);
    server.close(() => process.exit(1));
  });

  process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    server.close(() => process.exit(1));
  });
};

// Start the application
initializeApp().catch(console.error);