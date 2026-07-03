const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  createProject,
  getProjects,
  getProjectDetail,
  saveProjectDrawing,
  inviteMember,
} = require("../controllers/projectController");
const { searchUsers } = require("../controllers/userController");

// All routes are protected by auth middleware
router.use(protect);

router.post("/projects", createProject);
router.get("/projects", getProjects);
router.get("/projects/:projectId", getProjectDetail);
router.post("/projects/:projectId/save", saveProjectDrawing);
router.post("/projects/:projectId/invite", inviteMember);

router.get("/users/search", searchUsers);

module.exports = router;
