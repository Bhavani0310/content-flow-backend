const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const OrgSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  role: {
    type: String,
    required: true,
    default: "organizer", 
  },
  profileImageUrl: { type: String, default: "" },

  // Editors
  editorIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
  pendingEditors: [
    {
      editorId: { type: Schema.Types.ObjectId, ref: "User" },
      status: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending",
      },
    },
  ],

  // Tasks
  tasksCreated: [
    {
      taskId: { type: Schema.Types.ObjectId, ref: "Task" },
      editorId: { type: Schema.Types.ObjectId, ref: "User" },
    },
  ],

  // YouTube Integration
  youtubeChannelId: { type: String },
  youtubeChannelName: { type: String },
  youtubeAccessToken: { type: String },
  youtubeRefreshToken: { type: String },
  youtubeTokenExpiry: { type: Date },

  // Instagram Integration
  instagram: {
    igUserId: { type: String },
    username: { type: String },
    accessToken: { type: String },
    accessTokenExpiresIn: { type: Number },
  },

  // LinkedIn Integration
  linkedin: {
    linkedInId: { type: String },
    name: { type: String },
    accessToken: { type: String },
    accessTokenExpiresIn: { type: Number },
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Update timestamps
OrgSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

const Org = mongoose.model("Org", OrgSchema);
module.exports = Org;
