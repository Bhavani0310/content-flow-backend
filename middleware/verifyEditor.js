const jwt = require('jsonwebtoken');
const { verifyToken } = require("../helpers/jwt.helper");
const User= require('../Models/UsersModel');
const getTokenfromCookie =  require('../helpers/cookie.helper');
// Middleware to verify the JWT token from cookies
const verifyEditor = async (req, res, next) => {
  console.log(" verifying editor");
  console.log(req.headers.cookie);
  const token = getTokenfromCookie(req.headers.cookie); // Fetch token from cookies
  console.log(token);

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized access, no token provided' });
  }

  try {
    // Verify the token
    const decodedtoken =  await verifyToken(token);
    console.log(decodedtoken);
    if(!decodedtoken)
    {
        console.log(" token verification failed");
        return res.status(401).json({error:'Token verification failed'});
    }

    const user = await User.findOne(decodedtoken.userId)
    console.log("user id is ",user);
    req.user = decodedtoken; // Attach the decoded token payload to the request object
    console.log(" token verification successful");
    next(); // Proceed to the next middleware or route handler
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

module.exports=verifyEditor;