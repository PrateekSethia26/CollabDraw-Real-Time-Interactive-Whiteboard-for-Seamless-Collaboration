class SocketManager {
  constructor(io) {
    this.io = io;
    this.initializeSocketEvents();
    this.setupErrorHandling();
  }

  initializeSocketEvents() {
    this.io.on("connection", (socket) => {
      console.log(`User connected: ${socket.id}`);

      socket.on("join-room", ({ roomId, username }) => {
        socket.join(roomId);
        console.log(`Socket ${socket.id} joined room ${roomId}`);

        socket.in(roomId).emit("user:joined", {
          username,
          socketId: socket.id,
        });
      });

      // Existing user sends their canvas to the new joiner
      socket.on("canvas:send-state", ({ toSocketId, canvasJSON }) => {
        this.io.to(toSocketId).emit("canvas:load-state", canvasJSON);
      });

      socket.on("shape:draw", (path) => {
        try {
          const { roomId, ...rest } = path;
          socket.to(roomId).emit("shape:draw", rest);
          // socket.broadcast.emit("shape:draw", path);
        } catch (error) {
          this.handleError(socket, error, "drawing");
        }
      });

      socket.on("shape:modify", (modifiedShape) => {
        try {
          console.log("Modify id : ", modifiedShape);
          const { roomId, ...rest } = modifiedShape;
          socket.to(roomId).emit("shape:modify", rest);
          // socket.broadcast.emit("shape:modify", modifiedShape);
        } catch (error) {
          this.handleError(socket, error, "modifying shape");
        }
      });

      socket.on("canvas:undo", (param) => {
        try {
          const state = param || {};
          socket.broadcast.emit("canvas:undo", { state });
        } catch (error) {
          this.handleError(socket, error, "undoing");
        }
      });

      socket.on("canvas:clear", (param) => {
        try {
          const state = param || {};
          socket.broadcast.emit("canvas:clear", { state });
        } catch (error) {
          this.handleError(socket, error, "clearing canvas");
        }
      });

      socket.on("selection:update", (selectedIds) => {
        try {
          const { roomId, ...rest } = selectedIds;

          socket.to(roomId).emit("selection:update", rest);
          // socket.broadcast.emit("selection:update", selectedIds);
        } catch (error) {
          this.handleError(socket, error, "updating selection");
        }
      });

      socket.on("disconnect", () => {
        console.log(`User disconnected: ${socket.id}`);
      });
    });
  }

  setupErrorHandling() {
    this.io.on("error", (error) => {
      console.error(`Socket.IO global error: ${error.message}`);
    });
  }

  handleError(socket, error, action) {
    console.error(`Error during ${action}: ${error.message}`);
    socket.emit("error", { message: `Socket error while ${action}.` });
  }
}

module.exports = SocketManager;
