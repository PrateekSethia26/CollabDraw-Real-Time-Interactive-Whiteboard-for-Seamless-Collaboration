const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", // To Allow frontend requests
  },
});

app.use(cors);

io.on("connection", (socket) => {
  console.log(`User connected :  ${socket.id}`);

  socket.on("draw", (path) => {
    socket.broadcast.emit("draw", path);
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected : ${socket.id}`);
  });
});

server.listen(3001, () => {
  console.log("✅ Server running on http://localhost:3001");
});
