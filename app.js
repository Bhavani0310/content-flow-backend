const express = require("express");
require("dotenv").config();
const passport = require("passport");
const session = require("express-session");
const cors = require("cors");
const authRoutes = require("./routes/auth.route");
const editorRoutes = require("./routes/EditorRoutes");
const orgRoutes = require("./routes/OrgRoutes");
const instaGramRoutes = require("./routes/instagram.route");
require("./authentication/auth");

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "OPTIONS","PUT","DELETE"],
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.send("Backend Server running");
});

app.use(
  session({
    secret: "bhavani0310",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: true,
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);
app.use(passport.initialize());
app.use(passport.session());

app.use(authRoutes);

app.use(editorRoutes);

app.use(orgRoutes);
app.use(instaGramRoutes);
app.use("/api/content", require("./routes/content.route"));
module.exports = app;
