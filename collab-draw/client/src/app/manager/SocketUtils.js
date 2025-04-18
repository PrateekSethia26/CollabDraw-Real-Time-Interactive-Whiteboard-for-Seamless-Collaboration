import { io } from "socket.io-client";

const initializeSocket = (
  socket,
  setIsSocketEnabled,
  drawFromSocket,
  canvasContext,
) => {
  // Create a new socket connection with WebSocket transport
  if (typeof window === "undefined") return;

  socket.current = io("http://localhost:3001", {
    transports: ["websocket"], // Force WebSocket instead of polling
  });

  socket.current.on("connect", () => {
    console.log("Connected to the server");
    setIsSocketEnabled(true);
  });

  socket.current.on("disconnect", () => {
    console.log("Socket disconnected");
    setIsSocketEnabled(false);
  });

  socket.current.on("draw-data", (data) => {
    // console.log(data);
    if (canvasContext) {
      drawFromSocket(data);
    }
  });


  socket.current.on("start-drawing", (data) => {
    if(!canvasContext) return;
    canvasContext.beginPath();
    canvasContext.moveTo(data.x, data.y);
    canvasContext.strokeStyle = data.color;
    canvasContext.lineWidth = data.lineWidth;
  })

  return () => {
    socket.current.disconnect();
  };
};

export default initializeSocket;
