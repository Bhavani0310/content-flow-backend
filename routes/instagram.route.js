// routes/instagram.js
const express = require("express");
const router = express.Router();
const instaGram = require("../Controller/linkedIn.controller")
const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
const REDIRECT_URI = process.env.LINKEDIN_REDIRECT_URI;

router.get("/linkedIn/connect", (req, res) => {
  const { state } = req.query;

  const scope = [
    "openid",
    "profile",
    "email",
    "w_member_social"
  ].join(" "); // space-separated

  const authURL = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${LINKEDIN_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=${state}&scope=${encodeURIComponent(scope)}`;

  res.redirect(authURL);
});
  

router.get("/auth/linkedin/callback", instaGram.linkedinCallback);
router.get("/instagram/callback",instaGram.instagramCallback)
module.exports = router;