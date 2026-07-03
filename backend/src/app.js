const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const roomRoutes = require("./routes/roomRoutes");
const authRoutes = require("./routes/authRoutes");

const app = express();

// Allow requests from the frontend (with credentials for cookies)
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true, // required for cookies to be sent cross-origin
}));

// Parse JSON request bodies
app.use(express.json());

// Parse cookies (needed for reading JWT cookie)
app.use(cookieParser());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/room", roomRoutes);

// Health check
app.get("/", (req, res) => {
  res.send("CollaboDraw backend is running!");
});

module.exports = app;
