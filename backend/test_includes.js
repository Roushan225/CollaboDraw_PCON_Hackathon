const mongoose = require("mongoose");
const Project = require("./src/models/Project");

const project = new Project({
  projectId: "123",
  name: "test",
  creator: new mongoose.Types.ObjectId(),
  members: [new mongoose.Types.ObjectId("6a47cc2254d8ca484bf1b29b")]
});

console.log("Includes:", project.members.includes("6a47cc2254d8ca484bf1b29b"));
