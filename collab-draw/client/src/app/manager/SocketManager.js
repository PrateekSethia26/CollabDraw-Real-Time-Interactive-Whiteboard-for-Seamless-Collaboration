import { io } from "socket.io-client";

/**
 * Initialize and manage socket connection for the drawing canvas
 * 
 * @param {React.MutableRefObject} socketRef - Reference to store the socket instance
 * @param {boolean} isEnabled - Whether socket functionality is enabled
 * @param {Function} drawHandler - Handler for incoming 'shape:draw' events
 * @param {Function} modifyHandler - Handler for incoming 'shape:modify' events
 * @param {Object} canvas - The fabric.js canvas instance
 * @param {Function} selectionUpdateHandler - Handler for incoming 'selection:update' events
 * @returns {Function} Cleanup function to disconnect socket
 */
export default function initializeSocket(
  socketRef,
  isEnabled,
  drawHandler,
  modifyHandler,
  canvas,
  selectionUpdateHandler
) {
  // Early return if sockets are disabled
  if (!isEnabled) {
    console.log("Socket connections disabled. Running in local-only mode.");
    return () => {}; // Return empty cleanup function
  }

  console.log("Initializing socket connection...");

  // Close existing connection if any
  if (socketRef.current) {
    console.log("Closing existing socket connection");
    socketRef.current.disconnect();
    socketRef.current = null;
  }

  // Create new socket connection
  const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001", {
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    transports: ["websocket"],
  });

  // Store socket reference
  socketRef.current = socket;

  // Set up socket event listeners
  socket.on("connect", () => {
    console.log("Socket connected with ID:", socket.id);
  });

  socket.on("connect_error", (err) => {
    console.error("Socket connection error:", err.message);
  });

  socket.on("disconnect", (reason) => {
    console.log("Socket disconnected:", reason);
  });

  // Listen for drawing events from other clients
  socket.on("shape:draw", (data) => {
    console.log("Received shape:draw event:", data.type);
    if (drawHandler && typeof drawHandler === "function") {
      drawHandler(data);
    }
  });

  // Listen for modification events from other clients
  socket.on("shape:modify", (data) => {
    console.log("Received shape:modify event for object ID:", data.id);
    if (modifyHandler && typeof modifyHandler === "function") {
      modifyHandler(data);
    }
  });

  // Listen for selection update events from other clients
  socket.on("selection:update", (selectionIds) => {
    console.log("Received selection:update event:", selectionIds);
    if (selectionUpdateHandler && typeof selectionUpdateHandler === "function") {
      selectionUpdateHandler(selectionIds);
    }
  });

  // Listen for canvas undo events
  socket.on("canvas:undo", (data) => {
    console.log("Received canvas:undo event");
    if (canvas && data.state) {
      // Remove event listeners temporarily to prevent loops
      const tempListeners = canvas.__eventListeners;
      canvas.__eventListeners = {};
      
      // Load the state
      canvas.loadFromJSON(data.state, () => {
        // Restore event listeners
        canvas.__eventListeners = tempListeners;
        canvas.renderAll();
      });
    }
  });

  // Listen for canvas clear events
  socket.on("canvas:clear", (data) => {
    console.log("Received canvas:clear event");
    if (canvas) {
      // Remove event listeners temporarily to prevent loops
      const tempListeners = canvas.__eventListeners;
      canvas.__eventListeners = {};
      
      // Clear and set background
      canvas.clear();
      canvas.setBackgroundColor("#ffffff", () => {
        // Reload if state provided
        if (data.state) {
          canvas.loadFromJSON(data.state, () => {
            // Restore event listeners after loading
            canvas.__eventListeners = tempListeners;
            canvas.renderAll();
          });
        } else {
          // Just restore listeners if no state
          canvas.__eventListeners = tempListeners;
          canvas.renderAll();
        }
      });
    }
  });

  // Return cleanup function
  return () => {
    console.log("Cleaning up socket connection");
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  };
}