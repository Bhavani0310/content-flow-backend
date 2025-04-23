const express = require("express");
const router = express.Router();
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const LinkedInStrategy = require("passport-linkedin-oauth2").Strategy;
const {encrypt} = require("../helpers/cryptoUtils.js")
// Organizer controllers
const authController = require("../Controller/auth.controller");

//Editor controllers
const authControllerEditor = require("../Controller/autheditor.controller.js");
const editorController =  require('../Controller/Editor.controller.js');

// Importing middlewares
const verifyOrganizer = require("../middleware/verifyOrganizer.js");
const verifyEditor =  require("../middleware/verifyEditor.js");

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "https://content-flow-backend.vercel.app/auth/google/callback",
      passReqToCallback: true,
      accessType: 'offline',
      prompt: 'consent',
    },
    function (req, accessToken, refreshToken, profile, done) {
      // Encrypt the tokens before attaching
      const encryptedAccessToken = encrypt(accessToken);
      const encryptedRefreshToken = refreshToken ? encrypt(refreshToken) : null;

      profile.encryptedAccessToken = encryptedAccessToken;
      profile.encryptedRefreshToken = encryptedRefreshToken;

      console.log("Encrypted Access Token:", encryptedAccessToken);
      console.log("Encrypted Refresh Token:", encryptedRefreshToken);

      done(null, profile);
    }
  )
);

passport.use(
  new LinkedInStrategy(
    {
      clientID: process.env.LINKEDIN_CLIENT_ID,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
      callbackURL: "https://content-flow-backend.vercel.app/auth/linkedin/callback",
      scope: ['openid', 'profile', 'email', 'w_member_social'],
      state: true,
      passReqToCallback: true,
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        console.log(profile)
        const email = profile.emails?.[0]?.value;
        const linkedInId = profile.id;
        const name = profile.displayName;
        const encryptedAccessToken = encrypt(accessToken);

        // Use the state passed in the connect route to get orgId
        const orgId = req.query.state;

        const organizer = await Org.findById(orgId);
        if (!organizer) return done(new Error("Organizer not found"));

        organizer.linkedin = {
          linkedInId,
          name,
          accessToken: encryptedAccessToken,
          accessTokenExpiresIn: 60 * 60 * 60, // You can adjust based on API response
        };

        await organizer.save();

        // You can pass the organizer or userId in done()
        return done(null, organizer);
      } catch (err) {
        return done(err);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

//google login
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
  authController.googleCallback
);

// org logout 
router.get("/auth/orgLogout", verifyOrganizer, authController.handleLogout);

//verifyOrg
router.get("/auth/verifyorg",authController.AuthenticateGoogle);


router.get('/testOrganizerAuthentication',verifyOrganizer,authController.handleTextChange);

//editor routes auth
//editor authenticate
router.get("/auth/user",authController.AuthenticateUser);
router.post('/EditorLogin',authControllerEditor.HandleEditorLogin);
router.post('/EditorRegister',authControllerEditor.HandleEditorRegister);
router.get('/EditorLogout',verifyEditor,authControllerEditor.HandleEditorLogout);
router.get('/testEditorAuthentication',verifyEditor,authControllerEditor.handleTextChange);

//editor profile 
// router.post('/EditorProfileImageChange',verifyEditor,editorController.handleImageUpdate);


module.exports = router;