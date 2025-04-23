const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
require("dotenv").config();
const { google } = require("googleapis");
const User = require("../Models/UsersModel");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { signToken } = require("../helpers/jwt.helper");
// Auth routes
const express = require("express");
const router = express.Router();
// Set up Google strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:4000/auth/google/callback",
    },
    function (accessToken, refreshToken, profile, done) {
      profile.accessToken = accessToken; // Store the access token in the profile
      profile.refreshToken = refreshToken; // Optional: If you need to refresh the token later
      done(null, profile);
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

// Google OAuth Login
router.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: [
      "email",
      "profile",
      "https://www.googleapis.com/auth/youtube.upload",
    ],
  })
);

router.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: "https://content-flow-alpha.vercel.app", // Frontend login page URL
  }),
  async (req, res) => {
    // Successful authentication
    const profile = req.user;
    console.log(profile);
    const name = profile.displayName;
    const email = profile.emails[0].value;
    const youtubeChannelId = profile.id;

    // Check if user already exists in the database
    let user = await User.findOne({ email });

    if (!user) {
      // Create a new user with generated jwtSecretKey
      const newuser = new User({
        name,
        email,
        youtubeChannelId,
        // jwtSecretKey: crypto.randomBytes(32).toString("hex"),
        role: "organizer", // Assuming only organizers log in via Google
      });
      await newuser.save();
    }

    res.redirect("https://content-flow-alpha.vercel.app"); // Redirect to the frontend
  }
);

//Auth user
router.get("/auth/user", (req, res) => {
  if (req.isAuthenticated()) {
    res.json(req.user); // Send back the user info stored in the session
    console.log("authenticated");
    // console.log(req.user);
  } else {
    res.status(401).send("Unauthorized");
    console.log("not authorized");
  }
});

//logout api
router.get("/auth/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).send("Failed to log out.");
    }
    // Optionally clear the cookie as well
    res.clearCookie("connect.sid", { path: "/" });
    // Redirect the user to the frontend after logging out
    //   res.redirect('https://content-flow-alpha.vercel.app');
    res.status(200).send("Logged out successfully");
  });
  console.log("logout");
});

//editor API'S
router.post("/loginEditor", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const generatedToken = await signToken({
      id: user._id,
      email: user.email,
      name: user.name,
    });
    console.log("genetated token: ",generatedToken);
    res.cookie("token", generatedToken, {
      httpOnly: true, // Prevents JavaScript from accessing the cookie
      secure: process.env.NODE_ENV === "production", // Use secure cookies in production
      sameSite: "lax", // Protects against CSRF
      maxAge: 24 * 60 * 60 * 1000, // 1 day expiry
    });
    // Send success status to frontend
    res.status(200).json({ message: "Login successful", id: user._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/EditorRegister", async (req, res) => {
  const { name, email, password } = req.body;
  try {
    // Check if the email is already registered
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email is already registered" });
    }
    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    // Create a new editor
    const newEditor = new User({
      name,
      email,
      password: hashedPassword, // Store the hashed password
      // jwtSecretKey:jwtSecretKey,
      role: "editor", // Set the role to 'editor'
    });

    // Save the editor to the database
    await newEditor.save();

    res
      .status(201)
      .json({
        message: "Editor registered successfully",
        editorId: newEditor._id,
      });
  } catch (error) {
    console.error("Error registering editor:", error);
    res.status(500).json({ message: "Server error during registration" });
  }
});

module.exports = router;
