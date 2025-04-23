require("dotenv").config();
const User = require("../Models/UsersModel");
const jwtToken = require("../Models/jwt-token.model");
const bcrypt = require("bcryptjs");
const { signToken } = require("../helpers/jwt.helper");
const commonConstant = require("../constants/common.constant");
const HttpStatusConstant = require("../constants/http-message.constant");
const HttpStatusCode = require("../constants/http-code.constant");
const ResponseMessageConstant = require("../constants/response-message.constant");
const CommonConstant = require("../constants/common.constant");
const ErrorLogConstant = require("../constants/error-log.constant");
const getTokenfromCookie = require("../helpers/cookie.helper");
const s3Client = require("../config/awss3");
const youtubeClient = require("../config/youtube");

exports.HandleEditorLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    user.isActive = true;
    await user.save();
    const generatedToken = await signToken({
      id: user._id,
      email: user.email,
      name: user.name,
    });

    res.cookie("EditorToken", generatedToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
    });


    res
      .status(200)
      .json({ message: "Login successful", id: user._id, username: user.name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.HandleEditorRegister = async (req, res) => {
  const { name, email, password } = req.body;
  console.log(name, email, password);
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email is already registered" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newEditor = new User({
      name,
      email,
      password: hashedPassword,

      role: "editor",
    });

    await newEditor.save();

    res.status(201).json({
      message: "Editor registered successfully",
      editorId: newEditor._id,
    });
  } catch (error) {
    console.error("Error registering editor:", error);
    res.status(500).json({ message: "Server error during registration" });
  }
};

exports.HandleEditorLogout = async (req, res) => {
  try {
    const token = getTokenfromCookie(req.headers.cookie);
    await jwtToken.findOneAndDelete({
      jwtTokenId: token,
    });
    res
      .clearCookie(commonConstant.signatureCookieName, {
        secure: true,
        sameSite: "none",
      })
      .status(HttpStatusCode.Ok)
      .json({
        status: HttpStatusConstant.OK,
        code: HttpStatusCode.Ok,
      });
  } catch (error) {
    console.log(
      ErrorLogConstant.authController.handleLogoutErrorLog,
      error.message
    );
    res.status(HttpStatusCode.InternalServerError).json({
      status: HttpStatusConstant.ERROR,
      code: HttpStatusCode.InternalServerError,
    });
  }
};

exports.handleTextChange = async (req, res) => {
  res.status(200).send("Authorized user");
};
