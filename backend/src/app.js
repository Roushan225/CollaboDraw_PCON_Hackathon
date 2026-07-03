const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const roomRoutes = require("./routes/roomRoutes");
const authRoutes = require("./routes/authRoutes");

const app = express();

const allowedOrigins = [
  process.env.CLIENT_URL,
  "http://localhost:5173",
].filter(Boolean);

// Allow requests from the frontend (with credentials for cookies)
app.use(cors({
  origin: function (origin, callback) {
    // Allow server-to-server or test requests with no origin
    if (!origin) return callback(null, true);
    
    // If it matches allowed origins or matches localhost pattern
    if (allowedOrigins.indexOf(origin) !== -1 || origin.startsWith("http://localhost:")) {
      return callback(null, true);
    }
    
    // Fallback: reflect the origin to allow dynamic cross-origin credentials if wildcard is intended
    if (process.env.CLIENT_URL === "*") {
      return callback(null, true);
    }
    
    callback(new Error("Not allowed by CORS"));
  },
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
