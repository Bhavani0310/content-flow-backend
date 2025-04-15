const jwt = require('jsonwebtoken');

// Middleware to verify the JWT token from cookies
const authenticateToken = async (req, res, next) => {
  const token = req.cookies.token; // Fetch token from cookies

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized access, no token provided' });
  }

  try {
    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    req.user = decoded; // Attach the decoded token payload to the request object
    next(); // Proceed to the next middleware or route handler
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Middleware to check if the user is logged in
const isLoggedIn = async (req, res, next) => {
  console.log("Authentication is processing");

  if (req.user) {
    console.log("Authentication successful");
    next(); // Proceed to the next middleware or route handler
  } else {
    res.sendStatus(401); // Unauthorized access if user is not logged in
  }
};

module.exports = { isLoggedIn, authenticateToken };
