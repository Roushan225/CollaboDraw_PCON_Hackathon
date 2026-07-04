const mongoose = require("mongoose");
const Project = require("./src/models/Project");
const User = require("./src/models/User");
require("dotenv").config({ path: "./.env" });

mongoose.connect(process.env.MONGO_URI).then(async () => {
  // Mock req.userId for member 6a47cc2254d8ca484bf1b29b (who is a viewer)
  const req = { userId: "6a47cc2254d8ca484bf1b29b" };
  const projects = await Project.find({
      $or: [{ creator: req.userId }, { members: req.userId }],
    })
      .populate("creator", "username email")
      .populate("members", "username email lastActive")
      .sort({ createdAt: -1 });

  console.log("PROJECTS FOR VIEWER:", projects.map(p => p.name));
  process.exit(0);
});
