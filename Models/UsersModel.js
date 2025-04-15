const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const crypto = require("crypto");

const userSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String }, // Only for editors, hashed
  description:{type:String, default:"Hey! I am a Video Editor "},
  role: {
    type: String,
    required: true,
    defalut: "editor",
  },
  organizerId: { type: Schema.Types.ObjectId, ref: "Org" }, // For editors, after acceptance
  // For editors
  organizerRequestStatus: [{
    status: {
      type: String,
      enum: ["none", "pending", "approved", "rejected"],
      default: "none",
    },
    organizerId: { type: Schema.Types.ObjectId, ref: "Org" }, // Organizer to whom the request is sent
  }
  ],
  profileImageUrl: { type: String, default: "" },
  rating:{type:Number,default:0},
  
  assignedTasks: [{ type: Schema.Types.ObjectId, ref: "Task" }], // Only for editors

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Middleware to update `updatedAt` automatically
userSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

const User = mongoose.model("User", userSchema);
module.exports = User;
