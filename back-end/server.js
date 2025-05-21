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
const PORT = process.env.PORT || 10000;
const isProduction = process.env.NODE_ENV === 'production';

// Improved MongoDB connection
const connectDB = async () => {
  try {
    // Get the MongoDB URI from environment variables
    const mongoUrl = process.env.MONGO_URL;

    // If no MongoDB URI is provided, log an error and exit
    if (!mongoUrl) {
      console.error("MONGO_URL environment variable is not set");
      process.exit(1);
    }

    await mongoose.connect(mongoUrl, {
      useNewUrlParser: true,        // Add this option
      useUnifiedTopology: true,     // Add this option
      retryWrites: true,
      w: 'majority'
    });
    
    console.log("Connected to MongoDB successfully!");
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    // Print more detailed error information
    console.error("Error details:", err);
    process.exit(1);
  }
};
// Connect to DB first
connectDB();

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

// Middleware
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.resolve(__dirname, "../front-end")));

// Session configuration - Fixed MongoStore
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'fallback_secret_please_change',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      client: mongoose.connection.getClient(), // Reuse existing connection
      ttl: 14 * 24 * 60 * 60,
      autoRemove: 'native'
    }),
    cookie: {
      secure: isProduction,
      maxAge: 1000 * 60 * 60,
      sameSite: isProduction ? 'none' : 'lax',
      httpOnly: true
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
    await User.create({ username, password: hashedPassword });
    res.status(201).json({ 
      message: "User created successfully",
      success: true
    });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ 
      message: "Server error during signup.",
      error: "server_error"
    });
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ 
      message: "Username and password are required.",
      error: "validation_error"
    });
  }

  try {
    const user = await User.findOne({ username });

    if (user && await bcrypt.compare(password, user.password)) {
      req.session.user = { 
        username: user.username,
        id: user._id 
      };
      return res.json({ 
        message: "Login successful",
        success: true
      });
    } else {
      return res.status(401).json({ 
        message: "Invalid credentials",
        error: "auth_error"
      });
    }
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ 
      message: "Server error during login",
      error: "server_error"
    });
  }
});

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

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: "Something went wrong!",
    error: err.message,
    stack: isProduction ? undefined : err.stack
  });
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