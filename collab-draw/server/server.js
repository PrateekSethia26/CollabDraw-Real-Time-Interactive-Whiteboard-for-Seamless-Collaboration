const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const SocketManager = require("./SocketManager");
const dotenv = require("dotenv");

const app = express();
const server = http.createServer(app);
dotenv.config();

const backend_port = process.env.BACKEND_PORT || 3001;

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL, // To Allow frontend requests
  },
});

app.use(cors());
new SocketManager(io);

server.listen(backend_port, () => {
  console.log(`✅ Server running on http://localhost:${backend_port}`);
});
