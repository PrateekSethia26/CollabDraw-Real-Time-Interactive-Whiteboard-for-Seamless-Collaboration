"use client";

import React, { useRef, useState, useEffect } from "react";
import { io } from "socket.io-client";
import { Undo, Trash2 } from "lucide-react";

export default function WhiteBoard() {
  const canvasRef = useRef(null); // Referring to our canvas
  const socket = useRef(null); // Ref for Socket.io connection
  const [context, setContext] = useState(null); // for storing drawing context
  const [drawing, setDrawing] = useState(false);
  const [currentColor, setCurrentColor] = useState("black");
  const [lineWidth, setLineWidth] = useState(3);
  const [drawingActions, setDrawingActions] = useState([]); // Track our drawing history
  const [currentPath, setCurrentPath] = useState([]); // Path currently being drawn
  // const [currentStyle, setCurrentStyle] = useState({
  //   color: "black",
  //   lineWidth: 3,
  // }); // combines current color and line width

  const [isSocketEnabled, setIsSocketEnabled] = useState(true); // Toggle for online mode

  useEffect(() => {
    if (canvasRef.current) {
      // Checking canvasRef is available then set these properties to canvasRef
      const canvas = canvasRef.current;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const ctx = canvas.getContext("2d");
      ctx.strokeStyle = currentColor;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = "round";
      setContext(ctx);
      reDrawPreviousData(ctx); // To redraw previous drawing actions
      console.log(ctx);
    }
  }, []);

  useEffect(() => {
    // Create a new socket connection with WebSocket transport
    if (typeof window !== "undefined") {
      // Ensures it runs only on the client
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
        console.log(context);
        if (context) {
          drawFromSocket(data);
        }
      });

      return () => {
        socket.current.disconnect();
      };
    }
  }, [context]);

  // Function to handle when user start drawing
  const startDrawing = (e) => {
    if (context) {
      context.beginPath(); // Creates new Path if context present
      context.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
      setDrawing(true);
    }
  };

  const draw = (e) => {
    if (!drawing) return; // If the user is not actively drawing, exit the function.
    // If drawing then
    if (context) {
      context.strokeStyle = currentColor;
      context.lineWidth = lineWidth;
      context.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY); // Extend the path to the new cursor position.
      context.stroke(); // Render the line on the canvas.
      setCurrentPath([
        ...currentPath,
        { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY },
      ]); // Update the current path state with the new point.

      if (isSocketEnabled) {
        socket.current.emit("draw-data", {
          x: e.nativeEvent.offsetX,
          y: e.nativeEvent.offsetY,
          color: currentColor,
          lineWidth: lineWidth,
        });
      }
    }
  };

  const endDrawing = (e) => {
    setDrawing(false);
    context?.closePath();
    if (currentPath.length > 0) {
      setDrawingActions([
        ...drawingActions,
        { path: currentPath, color: currentColor, width: lineWidth },
      ]);
      setCurrentPath([]);
    }
  };

  const drawFromSocket = (data) => {
    // console.log(data);
    console.log(data.x);
    console.log(data.y);
    context.strokeStyle = data.color;
    context.lineWidth = data.lineWidth;
    context.lineTo(data.x, data.y);
    context.stroke();
  };

  const changeColor = (color) => {
    setCurrentColor(color);
    // setCurrentStyle({ ...currentStyle, color });
  };

  const changeWidth = (width) => {
    setLineWidth(width); // Update the state for UI
    // setCurrentStyle({ ...currentStyle, lineWidth: parseInt(width) });
  };

  const undoDrawing = () => {
    if (drawingActions.length > 0) {
      drawingActions.pop();
      const newContext = canvasRef.current.getContext("2d");
      newContext.clearRect(
        0,
        0,
        canvasRef.current.width,
        canvasRef.current.height
      );

      drawingActions.forEach(({ path, style }) => {
        newContext.beginPath();
        newContext.strokeStyle = style.color;
        newContext.lineWidth = style.lineWidth;
        newContext.moveTo(path[0].x, path[0].y);
        path.forEach((point) => {
          newContext.lineTo(point.x, point.y);
        });
        newContext.stroke();
      });
    }
  };

  const clearDrawing = () => {
    setDrawingActions([]);
    setCurrentPath([]);
    const newContext = canvasRef.current.getContext("2d");
    newContext.clearRect(
      0,
      0,
      canvasRef.current.width,
      canvasRef.current.height
    );
  };

  const reDrawPreviousData = (ctx) => {
    drawingActions.forEach(({ path, style }) => {
      ctx.beginPath();
      ctx.strokeStyle = style.color;
      ctx.lineWidth = style.lineWidth;
      ctx.moveTo(path[0].x, path[0].y);

      path.forEach((point) => {
        ctx.lineTo(point.x, point.y);
      });
      ctx.stroke();
    });
  };

  return (
    <div className="flex flex-col items-center bg-gray-100 min-h-screen p-6">
      <div className="bg-white shadow-lg rounded-lg p-4">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={endDrawing}
          onMouseOut={endDrawing}
          className="border border-gray-400 rounded-lg"
        />
      </div>

      {/* Toolbar */}
      <div className="bg-white shadow-md p-4 mt-4 flex flex-wrap justify-center items-center gap-4 rounded-lg w-full max-w-xl">
        {/* Color Picker */}
        <div className="flex items-center gap-2">
          {["red", "black", "blue", "green", "orange", "yellow"].map(
            (color) => (
              <div
                key={color}
                className={`w-8 h-8 rounded-full cursor-pointer border-2 ${
                  currentColor === color
                    ? "border-black scale-110"
                    : "border-transparent"
                }`}
                style={{ backgroundColor: color }}
                onClick={() => changeColor(color)}
              />
            )
          )}
        </div>

        {/* Brush Size */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Size:</span>
          <input
            type="range"
            min="1"
            max="10"
            value={lineWidth}
            onChange={(e) => changeWidth(e.target.value)}
            className="w-32"
          />
          <span className="text-sm text-gray-600">{lineWidth}</span>
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          <button
            className="flex items-center gap-1 bg-blue-500 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-600 transition"
            onClick={undoDrawing}
          >
            <Undo size={18} /> Undo
          </button>

          <button
            className="flex items-center gap-1 bg-red-500 text-white px-4 py-2 rounded-lg shadow hover:bg-red-600 transition"
            onClick={clearDrawing}
          >
            <Trash2 size={18} /> Clear
          </button>
        </div>
      </div>
    </div>
  );
}
