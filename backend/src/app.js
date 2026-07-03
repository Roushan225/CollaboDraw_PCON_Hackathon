const express = require("express");
const cors = require("cors");
const roomRoutes = require("./routes/roomRoutes");

const app = express();

// Allow requests from the frontend
app.use(cors({
  origin: process.env.CLIENT_URL || "*",
  credentials: true,
}));

// Parse JSON request bodies
app.use(express.json());

// Routes
app.use("/api/room", roomRoutes);

// Health check
app.get("/", (req, res) => {
  res.send("CollaboDraw backend is running!");
});

module.exports = app;
