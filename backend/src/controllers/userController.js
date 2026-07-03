const User = require("../models/User");

// GET /api/users/search?q=query
const searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim() === "") {
      return res.json({ success: true, users: [] });
    }

    // Search users containing query (excluding current user)
    const users = await User.find({
      username: { $regex: q, $options: "i" },
      _id: { $ne: req.userId }, // do not show current user
    })
      .select("username email")
      .limit(10);

    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { searchUsers };
