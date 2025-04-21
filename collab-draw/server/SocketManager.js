class SocketManager {
  constructor(io) {
    this.io = io;
    this.initializeSocketEvents();
    this.setupErrorHandling();
  }

  initializeSocketEvents() {
    this.io.on("connection", (socket) => {
      console.log(`User connected :  ${socket.id}`);

      socket.on("shape:draw", (path) => {
        try {
          socket.broadcast.emit("shape:draw", path);
        } catch (error) {
          console.error(`Error in draw-data event: ${error.message}`);
          socket.emit("error", { message: "Socket error while drawing." });
        }
      });

      socket.on("canvas:undo", (param) => {
        try {
          const state = param || {};
          socket.broadcast.emit("canvas:undo", { state });
        } catch (error) {
          console.error(`Error in undo event: ${error.message}`);
          socket.emit("error", { message: "Socket error while undoing." });
        }
      });

      socket.on("canvas:clear", (param) => {
        try {
          const state = param || {};
          socket.broadcast.emit("canvas:clear", { state });
        } catch (error) {
          console.error(`Error in clear event: ${error.message}`);
          socket.emit("error", { message: "Socket error while undoing." });
        }
      });

      socket.on("selection:update", (selectedIds) => {
        try {
          socket.broadcast.emit("selection:update", selectedIds);
        } catch (error) {
          console.error(`Error in selection:update event: ${error.message}`);
          socket.emit("error", {
            message: "Socket error during selection update.",
          });
        }
      });

      socket.on("disconnect", () => {
        console.log(`User disconnected : ${socket.id}`);
      });
    });
  }

  // Global error handling
  setupErrorHandling() {
    this.io.on("error", (error) => {
      console.error(`Socket.IO error: ${error.message}`);
    });
  }
}

module.exports = SocketManager;
