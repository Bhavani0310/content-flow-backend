const express = require('express');
const { google } = require('googleapis');
const router = express.Router();
const isLoggedIn = require('../authentication/AuthCheck');

// YouTube API setup
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  "https://content-flow-backend.vercel.app/auth/google/callback" // Redirect URL
);

const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
module.exports = router;
