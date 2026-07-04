const mongoose = require("mongoose");
const Project = require("./src/models/Project");
require("dotenv").config({ path: "./.env" });

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const projects = await Project.find({}).select("name members memberRoles creator");
  console.log(JSON.stringify(projects, null, 2));
  process.exit(0);
});
