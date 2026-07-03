require("dotenv").config();
const http = require("http");
const { Server } = require("socket.io");
const app = require("./app");
const connectDB = require("./config/db");
const setupSocket = require("./sockets/drawingSocket");

const PORT = process.env.PORT || 5000;

// Create HTTP server from Express app
const server = http.createServer(app);

// Attach Socket.io to the same server
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "*",
    methods: ["GET", "POST"],
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
