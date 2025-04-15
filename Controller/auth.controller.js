require("dotenv").config();
const Org = require("../Models/OrganizerModel");
const User = require("../Models/UsersModel");
const getTokenfromCookie = require("../helpers/cookie.helper");
const { verifyToken } = require("../helpers/jwt.helper");
const { google } = require("googleapis");

// const youtubeClient= require('../config/youtube');
// const oauth2Client = require('../config/oauth2client');
exports.googleCallback = async (req, res) => {
  const profile = req.user;

  const name = profile.displayName;
  const email = profile.emails[0].value;
  const youtubeChannelId = profile.id;
  const profileImageUrl = profile?.photos[0]?.value;

  const encryptedAccessToken = profile.encryptedAccessToken;
  const encryptedRefreshToken = profile.encryptedRefreshToken;

  let user = await Org.findOne({ email });

  if (!user) {
    const newuser = new Org({
      name,
      email,
      youtubeChannelId,
      profileImageUrl,
      youtubeChannelName: "", // You can fetch this later with YouTube API
      role: "organizer",
      youtubeAccessToken: encryptedAccessToken,
      youtubeRefreshToken: encryptedRefreshToken,
      youtubeTokenExpiry: new Date(Date.now() + 60 * 60 * 1000), // Optional: token expiry as 1hr from now
    });

    await newuser.save();

    const userId = newuser._id;
    return res.redirect(`http://localhost:5173/orgDashboard?userId=${userId}`);
  }

  // Update tokens in case they're refreshed
  user.youtubeAccessToken = encryptedAccessToken;
  if (encryptedRefreshToken) {
    user.youtubeRefreshToken = encryptedRefreshToken;
  }
  user.youtubeTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // Optional

  await user.save();

  const userId = user._id;
  res.redirect(`http://localhost:5173/orgDashboard?userId=${userId}`);
};

//Auth user
exports.AuthenticateGoogle = async (req, res) => {
  if (req.isAuthenticated()) {
    // console.log(req);
    // const {id}=req.body;
    // console.log(id);
    console.log("request user is ", req.user);
    const usermail = req.user.emails[0].value;
    console.log(usermail);
    const userDetails = await Org.findOne({ email: usermail });
    console.log(userDetails);

    console.log("authenticated");
    // const user = await Org.findOne({
    //   _id:
    // })
    return res.json({ data: userDetails }); // Send back the user info stored in the session
  } else {
    res.status(401).send("Unauthorized");
    console.log("not authorized");
  }
};

//Auth user (only editor)
exports.AuthenticateUser = async (req, res) => {
  if (!req.headers.cookie) {
    return res.status(401).json({ error: "token not provided" });
  }
  console.log("em rooo bidda");
  console.log(req.headers.cookie);
  const token = getTokenfromCookie(req.headers.cookie); // Fetch token from cookies
  console.log(token);

  if (!token) {
    return res
      .status(401)
      .json({ error: "Unauthorized access, no token provided" });
  }

  try {
    // Verify the token
    const decodedtoken = await verifyToken(token);
    console.log("decoded token is ", decodedtoken);
    if (!decodedtoken) {
      console.log(" token verification failed");
      return res.status(401).json({ error: "Token verification failed" });
    }

    const user = await User.findOne({ _id: decodedtoken?.id });
    console.log("user in the auth is ", user);
    delete user.password;
    if (user.organizerId != "") {
      const organizer = await Org.findById(user.organizerId);
      console.log("insisde the if in auth for org name");
      console.log("organizer is ", organizer);
      let organizerName = null;
      if (organizer) {
        console.log("organizer found");
        organizerName = organizer.name; // Add organizer's name to the user response
      }
      const responseUser = {
        ...user.toObject(), // Convert the Mongoose document to a plain object
        organizerName, // Add the organizerName field dynamically
      };
      req.user = decodedtoken;
      return res.status(200).json({ user: responseUser });
    }

    console.log("user id is ", user);
    req.user = decodedtoken; // Attach the decoded token payload to the request object
    console.log(" token verification successful");
    // next(); // Proceed to the next middleware or route handler

    return res.status(200).json({ user: user });
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

//logout api
exports.handleLogout = async (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).send("Failed to log out.");
    }
    // Optionally clear the cookie as well
    res.clearCookie("connect.sid", { path: "/" });
    // Redirect the user to the frontend after logging out
    //   res.redirect('http://localhost:5173');
    res.status(200).send("Logged out successfully");
  });
  console.log("logout");
};

exports.handleTextChange = async (req, res) => {
  res.status(200).send("Authorised user");
};
console.log("Selected code portion is empty");
