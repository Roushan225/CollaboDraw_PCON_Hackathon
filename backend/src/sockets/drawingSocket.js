// drawingSocket.js — handles all real-time drawing events

const setupSocket = (io) => {
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // User joins a specific drawing room
    socket.on("join-room", (roomId) => {
      socket.join(roomId);
      console.log(`Socket ${socket.id} joined room: ${roomId}`);
    });

    // Broadcast draw event to everyone else in the room
    // data = { points, color, strokeWidth, tool }
    socket.on("draw", ({ roomId, lineData }) => {
      socket.to(roomId).emit("draw", lineData);
    });

    // Broadcast clear canvas to everyone else in the room
    socket.on("clear-canvas", (roomId) => {
      socket.to(roomId).emit("clear-canvas");
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });
};

module.exports = setupSocket;
