class SocketManager {
  constructor(io) {
    this.io = io;
    this.initializeSocketEvents();
    this.setupErrorHandling();
  }

  initializeSocketEvents() {
    this.io.on("connection", (socket) => {
      console.log(`User connected :  ${socket.id}`);
      console.log(socket);


      socket.on("start-drawing", (path) => {
        socket.broadcast.emit("start-drawing", path);
      })

      socket.on("draw-data", (path) => {
        try {
          socket.broadcast.emit("draw-data", path);
        } catch (error) {
          console.error(`Error in draw-data event: ${error.message}`);
          socket.emit("error", { message: "Socket error while drawing." });
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
