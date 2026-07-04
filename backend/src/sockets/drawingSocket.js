// drawingSocket.js — handles all real-time drawing and slide events

const setupSocket = (io) => {
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // User joins a specific project/room
    socket.on("join-room", (roomId) => {
      socket.join(roomId);
      console.log(`Socket ${socket.id} joined room: ${roomId}`);
    });

    // Broadcast draw event scoped to a slide
    // data = { roomId, slideId, lineData }
    socket.on("draw", ({ roomId, slideId, lineData }) => {
      socket.to(roomId).emit("draw", { slideId, lineData });
    });

    // Broadcast clear canvas scoped to a slide
    socket.on("clear-canvas", ({ roomId, slideId }) => {
      socket.to(roomId).emit("clear-canvas", { slideId });
    });

    // Broadcast slide navigation/switches
    socket.on("switch-slide", ({ roomId, slideId, username }) => {
      socket.to(roomId).emit("switch-slide", { slideId, username });
    });

    // Broadcast slides list changes (add, rename, delete)
    socket.on("update-slides", ({ roomId, slides }) => {
      socket.to(roomId).emit("update-slides", slides);
    });

    // Broadcast tldraw shape / store changes
    socket.on("tldraw-change", ({ roomId, slideId, changes }) => {
      socket.to(roomId).emit("tldraw-change", { slideId, changes });
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });
};

module.exports = setupSocket;
