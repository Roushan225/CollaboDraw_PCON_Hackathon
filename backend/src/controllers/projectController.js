const Project = require("../models/Project");
const User = require("../models/User");

// Helper to generate a random room/project ID
const generateId = () => Math.random().toString(36).slice(2, 8).toUpperCase();

// POST /api/projects
const createProject = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: "Project name is required" });
    }

    const projectId = generateId();
    const project = await Project.create({
      projectId,
      name,
      creator: req.userId,
      members: [req.userId], // creator is also a member
    });

    res.status(201).json({ success: true, project });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/projects
const getProjects = async (req, res) => {
  try {
    // Find all projects where current user is creator or an invited member
    const projects = await Project.find({
      $or: [{ creator: req.userId }, { members: req.userId }],
    })
      .populate("creator", "username email")
      .populate("members", "username email")
      .sort({ createdAt: -1 });

    res.json({ success: true, projects });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/projects/:projectId
const getProjectDetail = async (req, res) => {
  try {
    const { projectId } = req.params;
    const project = await Project.findOne({ projectId })
      .populate("creator", "username email")
      .populate("members", "username email");

    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    // Authorization check
    const isCreator = project.creator._id.toString() === req.userId;
    const isMember = project.members.some(m => m._id.toString() === req.userId);

    if (!isCreator && !isMember) {
      return res.status(403).json({ success: false, message: "You are not authorized to access this project" });
    }

    res.json({ success: true, project });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/projects/:projectId/save
const saveProjectDrawing = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { drawingData } = req.body;

    const project = await Project.findOne({ projectId });
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    // Authorization check
    const isCreator = project.creator.toString() === req.userId;
    const isMember = project.members.some(m => m.toString() === req.userId);

    if (!isCreator && !isMember) {
      return res.status(403).json({ success: false, message: "Authorized users only" });
    }

    project.drawingData = drawingData;
    await project.save();

    res.json({ success: true, message: "Drawing autosaved successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/projects/:projectId/invite
const inviteMember = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ success: false, message: "Username is required" });
    }

    const project = await Project.findOne({ projectId });
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    // Only the creator can invite others
    if (project.creator.toString() !== req.userId) {
      return res.status(403).json({ success: false, message: "Only the project creator can invite members" });
    }

    // Find the user to invite
    const userToInvite = await User.findOne({ username: { $regex: new RegExp(`^${username}$`, "i") } });
    if (!userToInvite) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Check if already a member
    if (project.members.includes(userToInvite._id)) {
      return res.status(400).json({ success: false, message: "User is already a member of this project" });
    }

    project.members.push(userToInvite._id);
    await project.save();

    const updatedProject = await Project.findOne({ projectId })
      .populate("creator", "username email")
      .populate("members", "username email");

    res.json({ success: true, message: `Successfully invited ${userToInvite.username}`, project: updatedProject });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createProject,
  getProjects,
  getProjectDetail,
  saveProjectDrawing,
  inviteMember,
};
