const axios = require("axios");
const { encrypt, decrypt } = require("./cryptoUtils");

const refreshGoogleAccessToken = async (encryptedRefreshToken) => {
  const refreshToken = decrypt(encryptedRefreshToken);

  try {
    const response = await axios.post("https://oauth2.googleapis.com/token", null, {
      params: {
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      },
    });

    const newAccessToken = response.data.access_token;
    const expiresIn = response.data.expires_in; // in seconds

    return {
      encryptedAccessToken: encrypt(newAccessToken),
      accessToken: newAccessToken,
      expiresIn,
    };
  } catch (error) {
    console.error("Failed to refresh Google token:", error.response?.data || error.message);
    throw new Error("Could not refresh access token");
  }
};

module.exports = { refreshGoogleAccessToken };
