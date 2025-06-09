import { io } from "socket.io-client";
import toast from "react-hot-toast";

/**
 * Initialize and manage socket connection for the drawing canvas
 *
 * @param {React.MutableRefObject} socketRef - Reference to store the socket instance
 * @param {boolean} isEnabled - Whether socket functionality is enabled
 * @param {Function} drawHandler - Handler for incoming 'shape:draw' events
 * @param {Function} modifyHandler - Handler for incoming 'shape:modify' events
 * @param {Object} canvas - The fabric.js canvas instance
 * @param {string} roomId - The room ID for collaboration
 * @param {string} username - The current user's username
 * @param {Function} selectionUpdateHandler - Handler for incoming 'selection:update' events
 * @returns {Function} Cleanup function to disconnect socket
 */
export default function initializeSocket(
  socketRef,
  isEnabled,
  drawHandler,
  modifyHandler,
  canvas,
  roomId,
  username,
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
  const socket = io(
    process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001",
    {
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      transports: ["websocket"],
    }
  );

  // Store socket reference
  socketRef.current = socket;

  // Set up socket event listeners
  socket.on("connect", () => {
    console.log("Socket connected with ID:", socket.id);
    toast.success("Connected to collaboration server!");
    if (roomId && username) {
      socket.emit("join-room", { roomId, username });
    }
  });

  socket.on("connect_error", (err) => {
    console.error("Socket connection error:", err.message);
    toast.error("Connection error. Trying to reconnect...");
  });

  socket.on("disconnect", (reason) => {
    console.log("Socket disconnected:", reason);
    if (reason === "io server disconnect") {
      // the disconnection was initiated by the server, reconnect manually
      socket.connect();
    }
  });

  socket.on("user:joined", ({ username, socketId }) => {
    toast.success(`User ${username} joined the room`);

    if (canvas && socketId) {
      // Ensure IDs are included in the serialization
      const canvasJSON = JSON.stringify(canvas.toJSON(['id']));
      console.log("Sending canvas state to new user");
      socket.emit("canvas:send-state", {
        toSocketId: socketId,
        canvasJSON,
      });
    }
  });

  socket.on("canvas:load-state", (canvasJSON) => {
    if (!canvas || !canvasJSON) return;
    
    console.log("Received canvas state from another user");
    
    // Store event listeners temporarily to prevent loops
    const tempListeners = {...canvas.__eventListeners};
    canvas.__eventListeners = {};
    
    try {
      // Parse JSON if it's a string
      const jsonData = typeof canvasJSON === 'string' ? JSON.parse(canvasJSON) : canvasJSON;
      
      canvas.loadFromJSON(jsonData, () => {
        // Ensure all objects have IDs
        canvas.getObjects().forEach(obj => {
          if (!obj.id) {
            console.warn("Object missing ID after load:", obj.type);
            // Assign ID if missing
            obj.id = Math.random().toString(36).substring(2, 15);
          }
        });
        
        // Restore event listeners and render
        canvas.__eventListeners = tempListeners;
        canvas.renderAll();
        console.log("Canvas state loaded successfully");
      });
    } catch (error) {
      console.error("Error loading canvas state:", error);
      canvas.__eventListeners = tempListeners; // Restore listeners even on error
      toast.error("Error loading canvas state");
    }
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
    if (
      selectionUpdateHandler &&
      typeof selectionUpdateHandler === "function"
    ) {
      selectionUpdateHandler(selectionIds);
    }
  });

  socket.on("canvas:undo", (data) => {
    console.log("Received canvas:undo event");
    if (canvas && data.state) {
      // Store event listeners temporarily
      const tempListeners = {...canvas.__eventListeners};
      canvas.__eventListeners = {};

      try {
        // Parse JSON if it's a string
        const jsonData = typeof data.state === 'string' ? JSON.parse(data.state) : data.state;
        
        // Load the state
        canvas.loadFromJSON(jsonData, () => {
          // Ensure all objects have IDs
          canvas.getObjects().forEach(obj => {
            if (!obj.id) {
              console.warn("Object missing ID after undo:", obj.type);
              obj.id = Math.random().toString(36).substring(2, 15);
            }
          });
          
          // Restore event listeners
          canvas.__eventListeners = tempListeners;
          canvas.renderAll();
        });
      } catch (error) {
        console.error("Error processing undo:", error);
        canvas.__eventListeners = tempListeners; // Restore listeners even on error
        toast.error("Error applying undo action");
      }
    }
  });

  // Listen for canvas clear events
  socket.on("canvas:clear", (data) => {
    console.log("Received canvas:clear event");
    if (canvas) {
      // Store event listeners temporarily
      const tempListeners = {...canvas.__eventListeners};
      canvas.__eventListeners = {};

      // Clear and set background
      canvas.clear();
      canvas.setBackgroundColor("#ffffff", () => {
        // Reload if state provided
        if (data && data.state) {
          try {
            // Parse JSON if it's a string
            const jsonData = typeof data.state === 'string' ? JSON.parse(data.state) : data.state;
            
            canvas.loadFromJSON(jsonData, () => {
              // Ensure all objects have IDs
              canvas.getObjects().forEach(obj => {
                if (!obj.id) {
                  obj.id = Math.random().toString(36).substring(2, 15);
                }
              });
              
              // Restore event listeners after loading
              canvas.__eventListeners = tempListeners;
              canvas.renderAll();
            });
          } catch (error) {
            console.error("Error loading state after clear:", error);
            canvas.__eventListeners = tempListeners; // Restore listeners even on error
          }
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