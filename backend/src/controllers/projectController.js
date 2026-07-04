const Project = require("../models/Project");
const User = require("../models/User");

// Helper to generate random IDs
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
      members: [req.userId], // creator is a member
      slides: [{
        slideId: "slide-1",
        name: "Slide 1",
        drawingData: {},
      }],
    });

    res.status(201).json({ success: true, project });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/projects
const getProjects = async (req, res) => {
  try {
    const projects = await Project.find({
      $or: [{ creator: req.userId }, { members: req.userId }],
    })
      .populate("creator", "username email")
      .populate("members", "username email lastActive")
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
      .populate("members", "username email lastActive");

    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    const isCreator = project.creator._id.toString() === req.userId;
    const isMember = project.members.some(m => m._id.toString() === req.userId);

    if (!isCreator && !isMember) {
      // Automatically add the user as a collaborator to this project room
      project.members.push(req.userId);
      await project.save();
      
      // Populate the newly updated members array
      await project.populate("members", "username email lastActive");
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
    const { slideId, drawingData } = req.body;

    if (!slideId) {
      return res.status(400).json({ success: false, message: "slideId is required" });
    }

    const normalizedDrawingData = drawingData?.store
      ? drawingData
      : drawingData?.document?.store
        ? drawingData.document
        : null;

    if (!normalizedDrawingData) {
      return res.status(400).json({ success: false, message: "Valid drawingData is required and cannot be null" });
    }

    const project = await Project.findOne({ projectId });
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    // Auth check
    const isCreator = project.creator.toString() === req.userId;
    const isMember = project.members.some(m => m.toString() === req.userId);
    if (!isCreator && !isMember) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    // Find the slide to update
    const slide = project.slides.find(s => s.slideId === slideId);
    if (!slide) {
      return res.status(404).json({ success: false, message: "Slide not found" });
    }

    slide.drawingData = normalizedDrawingData;
    project.markModified("slides");
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

    if (project.creator.toString() !== req.userId) {
      return res.status(403).json({ success: false, message: "Creators only" });
    }

    const userToInvite = await User.findOne({ username: { $regex: new RegExp(`^${username}$`, "i") } });
    if (!userToInvite) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (project.members.includes(userToInvite._id)) {
      return res.status(400).json({ success: false, message: "User is already a member" });
    }

    project.members.push(userToInvite._id);
    await project.save();

    const updatedProject = await Project.findOne({ projectId })
      .populate("creator", "username email")
      .populate("members", "username email lastActive");

    res.json({ success: true, message: `Successfully invited ${userToInvite.username}`, project: updatedProject });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/projects/:projectId/role
const updateMemberRole = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { targetUserId, role } = req.body;

    if (!targetUserId || !role) {
      return res.status(400).json({ success: false, message: "targetUserId and role are required" });
    }

    if (!["editor", "viewer"].includes(role)) {
      return res.status(400).json({ success: false, message: "Role must be 'editor' or 'viewer'" });
    }

    const project = await Project.findOne({ projectId });
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    // Only creators can change roles
    if (project.creator.toString() !== req.userId) {
      return res.status(403).json({ success: false, message: "Only creators can change member roles" });
    }

    // You can't change the creator's role
    if (targetUserId === req.userId) {
      return res.status(400).json({ success: false, message: "Cannot change the creator's role" });
    }

    // Ensure the target is actually a member
    if (!project.members.includes(targetUserId)) {
      return res.status(404).json({ success: false, message: "Target user is not a member of this project" });
    }

    project.memberRoles.set(targetUserId, role);
    await project.save();

    res.json({ success: true, message: `User role updated to ${role}`, memberRoles: project.memberRoles });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ── SLIDES CRUD CONTROLLERS ── */

// POST /api/projects/:projectId/slides
const addSlide = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { name } = req.body;

    const project = await Project.findOne({ projectId });
    if (!project) return res.status(404).json({ success: false, message: "Project not found" });

    // Creator & members can both add slides
    const isCreator = project.creator.toString() === req.userId;
    const isMember = project.members.some(m => m.toString() === req.userId);
    if (!isCreator && !isMember) return res.status(403).json({ success: false, message: "Unauthorized" });

    const slideId = `slide-${Date.now()}`;
    const newSlideName = name || `Slide ${project.slides.length + 1}`;

    project.slides.push({
      slideId,
      name: newSlideName,
      drawingData: {},
    });

    await project.save();
    res.status(201).json({ success: true, slides: project.slides, slideId });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/projects/:projectId/slides/:slideId
const renameSlide = async (req, res) => {
  try {
    const { projectId, slideId } = req.params;
    const { name } = req.body;

    if (!name) return res.status(400).json({ success: false, message: "Slide name is required" });

    const project = await Project.findOne({ projectId });
    if (!project) return res.status(404).json({ success: false, message: "Project not found" });

    const isCreator = project.creator.toString() === req.userId;
    const isMember = project.members.some(m => m.toString() === req.userId);
    if (!isCreator && !isMember) return res.status(403).json({ success: false, message: "Unauthorized" });

    const slide = project.slides.find(s => s.slideId === slideId);
    if (!slide) return res.status(404).json({ success: false, message: "Slide not found" });

    slide.name = name;
    await project.save();

    res.json({ success: true, slides: project.slides });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/projects/:projectId/slides/:slideId
const deleteSlide = async (req, res) => {
  try {
    const { projectId, slideId } = req.params;

    const project = await Project.findOne({ projectId });
    if (!project) return res.status(404).json({ success: false, message: "Project not found" });

    // Creators and members can delete slides
    const isCreator = project.creator.toString() === req.userId;
    const isMember = project.members.some(m => m.toString() === req.userId);
    if (!isCreator && !isMember) return res.status(403).json({ success: false, message: "Unauthorized" });

    // Guard: Prevent deleting if only one slide is left
    if (project.slides.length <= 1) {
      return res.status(400).json({ success: false, message: "Project must contain at least one slide" });
    }

    const slideIndex = project.slides.findIndex(s => s.slideId === slideId);
    if (slideIndex === -1) return res.status(404).json({ success: false, message: "Slide not found" });

    project.slides.splice(slideIndex, 1);
    await project.save();

    res.json({ success: true, slides: project.slides });
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
  addSlide,
  renameSlide,
  deleteSlide,
  updateMemberRole,
};
