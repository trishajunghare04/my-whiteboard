const express = require("express");
const http    = require("http");
const { Server } = require("socket.io");
const cors   = require("cors");
require("dotenv").config();

const { initDB, pool } = require("./db");
const authRoutes      = require("./routes/auth");
const boardsRoutes    = require("./routes/boards");
const templatesRoutes = require("./routes/templates");
const aiRoutes        = require("./routes/ai");
const groupsRoutes    = require("./routes/groups");

const app    = express();
const server = http.createServer(app);

const CLIENT = process.env.CLIENT_URL || "http://localhost:3000";

const io = new Server(server, {
  cors: { origin: CLIENT, methods: ["GET","POST"], credentials: true }
});

app.use(cors({ origin: CLIENT, credentials: true }));
app.use(express.json({ limit: "10mb" }));

// ── Routes ──────────────────────────────────────────────────────────────
app.use("/api/auth",      authRoutes);
app.use("/api/boards",    boardsRoutes);
app.use("/api/templates", templatesRoutes);
app.use("/api/ai",        aiRoutes);
app.use("/api/groups",    groupsRoutes);
app.get("/api/health", (_req, res) => res.json({ status:"ok", time: new Date() }));

// ── Socket.IO real-time collaboration ───────────────────────────────────
const COLORS = ["#6C47FF","#3B82F6","#10B981","#F59E0B","#EF4444","#EC4899","#8B5CF6","#14B8A6"];
const rooms  = new Map(); // boardId → Map(socketId → userInfo)

io.on("connection", socket => {

  socket.on("board:join", ({ boardId, userId, userName }) => {
    socket.join(boardId);
    if (!rooms.has(boardId)) rooms.set(boardId, new Map());
    const room  = rooms.get(boardId);
    const color = COLORS[room.size % COLORS.length];
    room.set(socket.id, { socketId: socket.id, userId, name: userName || "Anonymous", color, cursor:{ x:0, y:0 } });

    socket.to(boardId).emit("user:joined",  { socketId: socket.id, name: userName, color });
    socket.emit("room:users", Array.from(room.values()));
  });

  socket.on("canvas:update", ({ boardId, data }) => {
    socket.to(boardId).emit("canvas:update", data);
  });

  socket.on("cursor:move", ({ boardId, x, y }) => {
    const room = rooms.get(boardId);
    if (room?.has(socket.id)) {
      const info = room.get(socket.id);
      info.cursor = { x, y };
      socket.to(boardId).emit("cursor:move", { socketId: socket.id, name: info.name, color: info.color, x, y });
    }
  });

  socket.on("chat:message", ({ boardId, message, userName }) => {
    io.to(boardId).emit("chat:message", { id: Date.now(), message, userName, time: new Date().toLocaleTimeString() });
  });

  socket.on("disconnecting", () => {
    for (const boardId of socket.rooms) {
      const room = rooms.get(boardId);
      if (!room) continue;
      const info = room.get(socket.id);
      room.delete(socket.id);
      socket.to(boardId).emit("user:left", { socketId: socket.id, name: info?.name });
      if (room.size === 0) rooms.delete(boardId);
    }
  });
});

// ── Start ────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || "5000", 10);

const startServer = async () => {
  // Initialise DB first
  await initDB();

  // Try the configured port, fall back if busy
  server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });

  server.on("error", err => {
    if (err.code === "EADDRINUSE") {
      const alt = PORT + 1;
      console.warn(`⚠️  Port ${PORT} in use — trying ${alt}`);
      server.listen(alt, () => {
        console.log(`🚀 Server running on http://localhost:${alt}`);
        console.log(`   Update CLIENT_URL in frontend if needed.`);
      });
    } else {
      console.error("Server error:", err);
      process.exit(1);
    }
  });
};

startServer().catch(err => {
  console.error("Failed to start:", err.message);
  process.exit(1);
});
