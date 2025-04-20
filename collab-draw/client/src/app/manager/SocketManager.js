import { io } from "socket.io-client";
import { fabric } from "fabric";

const initializeSocket = (
  socket,
  isSocketEnabled,
  drawFromSocket,
  fabricCanvas
) => {
  // Create a new socket connection with WebSocket transport
  if (typeof window === "undefined") return;

  socket.current = io("http://localhost:3001", {
    transports: ["websocket"], // Force WebSocket instead of polling
  });

  socket.current.on("connect", () => {
    console.log("Connected to the server");
    // setIsSocketEnabled(true);
  });

  socket.current.on("disconnect", () => {
    console.log("Socket disconnected");
    // setIsSocketEnabled(false);
  });

  socket.current.on("shape:draw", (data) => {
    console.log(data);
    if (fabricCanvas) {
      drawFromSocket(data);
    }
  });

  socket.current.on("canvas:undo", ({ state }) => {
    if (fabricCanvas && state) {
      fabricCanvas.loadFromJSON(state, () => {
        fabricCanvas.renderAll();
      });
    }
  });

  socket.current.on("canvas:clear", ({ state }) => {
    if (fabricCanvas && state) {
      fabricCanvas.loadFromJSON(state, () => {
        fabricCanvas.renderAll();
      });
    }
  });

  return () => {
    socket.current.disconnect();
  };
};

export default initializeSocket;
