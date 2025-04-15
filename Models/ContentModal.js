const mongoose = require("mongoose");

const contentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  platform: { type: String, enum: ["Instagram", "LinkedIn", "YouTube"] },
  status: {
    type: String,
    enum: ["Draft", "Review", "Scheduled", "Published"],
    default: "Draft"
  },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  scheduledDate: Date,
  tags: [String],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });

module.exports = mongoose.model("Content", contentSchema);