const { google } = require('googleapis');
exports.oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    "http://localhost:4000/auth/google/callback" // Redirect URL
  );