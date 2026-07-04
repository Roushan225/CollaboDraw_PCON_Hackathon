// drawingSocket.js — handles real-time drawing, slide navigations, live presence, and WebSocket group/private chat
const roomUsers = {}; // roomId -> Array of { socketId, userId, username }
const socketRooms = {}; // socketId -> { roomId, userId, username }

const setupSocket = (io) => {
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // User joins a specific project/room with presence context
    socket.on("join-room", (payload) => {
      // Handle legacy single-string roomId payloads or object payloads
      let roomId = payload;
      let userId = socket.id;
      let username = "Guest";

      if (payload && typeof payload === "object") {
        roomId = payload.roomId;
        userId = payload.userId || socket.id;
        username = payload.username || "Guest";
      }

      socket.join(roomId);

      // Clean up previous registration for this socket if any
      if (socketRooms[socket.id]) {
        const prevRoom = socketRooms[socket.id].roomId;
        if (roomUsers[prevRoom]) {
          roomUsers[prevRoom] = roomUsers[prevRoom].filter(u => u.socketId !== socket.id);
          io.to(prevRoom).emit("presence-update", roomUsers[prevRoom]);
        }
      }

      socketRooms[socket.id] = { roomId, userId, username };

      if (!roomUsers[roomId]) {
        roomUsers[roomId] = [];
      }

      // Check if user is already present to prevent duplicates from multiple tabs/reconnects
      const alreadyIn = roomUsers[roomId].some(u => u.userId === userId);
      if (!alreadyIn) {
        roomUsers[roomId].push({ socketId: socket.id, userId, username });
      } else {
        const idx = roomUsers[roomId].findIndex(u => u.userId === userId);
        if (idx !== -1) roomUsers[roomId][idx].socketId = socket.id;
      }

      io.to(roomId).emit("presence-update", roomUsers[roomId]);
      console.log(`User ${username} joined room: ${roomId}`);
    });

    // Broadcast draw event scoped to a slide
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

    // WebSocket Team/Group Chat Messages
    socket.on("send-chat-message", ({ roomId, text, senderId, senderName }) => {
      const msg = {
        id: Math.random().toString(36).substring(2, 9),
        text,
        senderId,
        senderName,
        timestamp: new Date().toISOString(),
        type: "team"
      };
      io.to(roomId).emit("chat-message", msg);
    });

    // WebSocket Individual / Private Messages
    socket.on("send-private-message", ({ roomId, text, senderId, senderName, receiverId }) => {
      const msg = {
        id: Math.random().toString(36).substring(2, 9),
        text,
        senderId,
        senderName,
        receiverId,
        timestamp: new Date().toISOString(),
        type: "private"
      };

      const users = roomUsers[roomId] || [];
      
      // Dispatch to receiver's sockets
      const receiverSockets = users.filter(u => u.userId === receiverId).map(u => u.socketId);
      receiverSockets.forEach(sId => {
        io.to(sId).emit("private-message", msg);
      });

      // Dispatch to sender's sockets
      const senderSockets = users.filter(u => u.userId === senderId).map(u => u.socketId);
      senderSockets.forEach(sId => {
        io.to(sId).emit("private-message", msg);
      });
    });

    // Disconnect handler
    socket.on("disconnect", () => {
      const info = socketRooms[socket.id];
      if (info) {
        const { roomId, username } = info;
        delete socketRooms[socket.id];
        if (roomUsers[roomId]) {
          roomUsers[roomId] = roomUsers[roomId].filter(u => u.socketId !== socket.id);
          io.to(roomId).emit("presence-update", roomUsers[roomId]);
        }
        console.log(`User ${username} disconnected: ${socket.id}`);
      }
    });
  });
};

module.exports = setupSocket;
