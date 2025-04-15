const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const crypto = require("crypto");

const taskSchema = new Schema({
  taskName: { type: String, required: true },
  organizerId: { type: Schema.Types.ObjectId, ref: "Org", required: true }, // Organizer who created the task
  editorId: { type: Schema.Types.ObjectId, ref: "User", required: true }, // Editor assigned to the task
  rawImageUrl:[{ type: String, required: true }],
  editedImageUrls: [
    {
      url: { type: String, required: true }, // S3 URL for the edited video
      uploadedToYoutube: { type: Boolean, default: false }, // New field],  // Array of S3 URLs for edited video versions
      uploadedToLinkedIn:{ type: Boolean, default: false }
    },
  ],
  rawVideoUrl: [{ type: String, required: true }], // S3 URL for the raw video
  editedVideoUrls: [
    {
      url: { type: String, required: true }, // S3 URL for the edited video
      uploadedToYoutube: { type: Boolean, default: false }, // New field],  // Array of S3 URLs for edited video versions
    },
  ],
  taskDetails: { type: String }, // Instructions from the organizer
  taskStatus: {
    type: String,
    enum: ["assigned", "in_progress", "completed","need_review","not_started"],
    default: "in_progress",
  }, // Task status
  deadline: { type: Date, default: null },
  priority: {
    type: String,
    enum: ["Low", "Medium", "High"],
    default: "Medium",
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const TaskModel = mongoose.model("Task", taskSchema);
module.exports = TaskModel;
