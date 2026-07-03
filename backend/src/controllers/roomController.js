const Room = require("../models/Room");

// GET /api/room/:roomId — fetch saved drawing data
const getRoomData = async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = await Room.findOne({ roomId });

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    res.json({ drawingData: room.drawingData });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/room/:roomId — save/update drawing data
const saveRoomData = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { drawingData } = req.body;

    // upsert: create room if not exists, update if exists
    const room = await Room.findOneAndUpdate(
      { roomId },
      { drawingData },
      { upsert: true, new: true }
    );

    res.json({ message: "Drawing saved", drawingData: room.drawingData });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getRoomData, saveRoomData };
