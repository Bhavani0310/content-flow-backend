const axios = require("axios");
const Org = require("../Models/OrganizerModel");
const { encrypt } = require("../helpers/cryptoUtils");

const CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
const CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;
const REDIRECT_URI = process.env.LINKEDIN_REDIRECT_URI;

const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID;
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET;
const INSTA_REDIRECT_URI = "http://localhost:4000/instagram/callback";

exports.linkedinCallback = async (req, res) => {
  const code = req.query.code;
  const userId = req.query.state; // from frontend
console.log(req.query)
  try {
    // 1. Exchange code for access token
    const tokenRes = await axios.post(
      "https://www.linkedin.com/oauth/v2/accessToken",
      null,
      {
        params: {
          grant_type: "authorization_code",
          code,
          redirect_uri: REDIRECT_URI,
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
        },
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const accessToken = tokenRes.data.access_token;
    const expiresIn = tokenRes.data.expires_in;

     // 2. Fetch user info using the OpenID UserInfo endpoint
     const userInfoRes = await axios.get("https://api.linkedin.com/v2/userinfo", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const data = userInfoRes.data;

    const linkedInId = data.sub;
    const fullName = data.name;
    const email = data.email || "";
    const profileImageUrl = data.picture || "";

    // 3. Save to your organizer model
    const org = await Org.findById(userId);
    if (!org) return res.status(404).json({ error: "Organizer not found" });

    org.linkedin = {
      linkedInId,
      name: fullName,
      accessToken: accessToken,
      accessTokenExpiresIn: expiresIn,
    };

    if (!org.profileImageUrl && profileImageUrl) {
      org.profileImageUrl = profileImageUrl;
    }

    await org.save();

    res.redirect(`https://content-flow-alpha.vercel.app/orgDashboard?userId=${org._id}&linkedinConnected=true`);
  } catch (error) {
    console.error("LinkedIn OpenID error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to connect LinkedIn" });
  }
};




exports.instagramCallback = async (req, res) => {
  const code = req.query.code;
  const userId = req.query.state; // Optional: if you passed a userId via `state`

  try {
    // 1. Exchange code for short-lived access token
    const tokenRes = await axios.get("https://graph.facebook.com/v22.0/oauth/access_token", {
      params: {
        client_id: FACEBOOK_APP_ID,
        client_secret: FACEBOOK_APP_SECRET,
        redirect_uri: INSTA_REDIRECT_URI,
        code,
      },
    });

    const shortLivedToken = tokenRes.data.access_token;

    // 2. Exchange for long-lived token
    const longTokenRes = await axios.get("https://graph.facebook.com/v22.0/oauth/access_token", {
      params: {
        grant_type: "fb_exchange_token",
        client_id: FACEBOOK_APP_ID,
        client_secret: FACEBOOK_APP_SECRET,
        fb_exchange_token: shortLivedToken,
      },
    });

    const longLivedToken = longTokenRes.data.access_token;
    const expiresIn = longTokenRes.data.expires_in;
console.log(longLived)
    // 3. Get Pages connected to this user
    const pagesRes = await axios.get("https://graph.facebook.com/me/accounts", {
      params: { access_token: longLivedToken },
    });
console.log(pagesRes.data)
    const page = pagesRes.data.data[0];
    const pageAccessToken = page.access_token;
    const pageId = page.id;

    // 4. Get IG Business Account ID
    const igRes = await axios.get(`https://graph.facebook.com/v22.0/${pageId}`, {
      params: {
        fields: "instagram_business_account",
        access_token: pageAccessToken,
      },
    });

    const igUserId = igRes.data.instagram_business_account.id;

    // 5. Get IG Username
    const igProfile = await axios.get(`https://graph.facebook.com/v22.0/${igUserId}?fields=username&access_token=${pageAccessToken}`);
    const username = igProfile.data.username;

    // 6. Save to DB (encrypted)
    const organizer = await Org.findById(userId);
    if (!organizer) return res.status(404).json({ error: "Organizer not found" });

    organizer.instagram = {
      igUserId,
      username,
      accessToken: encrypt(pageAccessToken),
      accessTokenExpiresIn: expiresIn,
    };

    await organizer.save();

    res.redirect(`https://content-flow-alpha.vercel.app/orgDashboard?userId=${organizer._id}&instagramConnected=true`);
  } catch (error) {
    console.error("Instagram OAuth Error:", error.response?.data || error.message);
    res.status(500).json({ error: "Instagram connection failed" });
  }
};