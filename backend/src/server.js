require("dotenv").config();
const http = require("http");
const { Server } = require("socket.io");
const app = require("./app");
const connectDB = require("./config/db");
const setupSocket = require("./sockets/drawingSocket");

const PORT = process.env.PORT || 5000;

// Create HTTP server from Express app
const server = http.createServer(app);

// Attach Socket.io to the server with matching dynamic CORS origins
const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      const allowed = [
        process.env.CLIENT_URL,
        "http://localhost:5173",
        "https://collabo-draw-pcon-hackathon.vercel.app"
      ].filter(Boolean);
      if (!origin || allowed.indexOf(origin) !== -1 || origin.startsWith("http://localhost:")) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Setup socket event handlers
setupSocket(io);

// Start server listening immediately (allows Railway health checks to pass)
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  // Connect to MongoDB in the background
  connectDB();
});
