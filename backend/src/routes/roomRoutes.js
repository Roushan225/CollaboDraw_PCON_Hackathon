const express = require("express");
const router = express.Router();
const { getRoomData, saveRoomData } = require("../controllers/roomController");

router.get("/:roomId", getRoomData);
router.post("/:roomId", saveRoomData);

module.exports = router;
