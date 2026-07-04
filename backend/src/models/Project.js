const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema({
  projectId: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: [true, "Project name is required"],
    trim: true,
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  }],
  slides: [{
    slideId: { type: String, required: true },
    name: { type: String, required: true },
    drawingData: { type: mongoose.Schema.Types.Mixed, default: {} },
  }],
  messages: [{
    id: { type: String, required: true },
    text: { type: String, required: true },
    senderId: { type: String, required: true },
    senderName: { type: String, required: true },
    receiverId: { type: String },
    timestamp: { type: Date, default: Date.now },
    type: { type: String, enum: ["team", "private"], required: true }
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Project", projectSchema);
