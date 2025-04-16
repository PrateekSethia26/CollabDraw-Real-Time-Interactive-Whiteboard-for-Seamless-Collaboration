"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { Undo, Trash2, Minus, Circle, Square, Pencil } from "lucide-react";
import useCanvas from "../manager/DrawingManager";
import intializeSocket from "../manager/SocketUtils";

export default function WhiteBoard() {
  const canvasRef = useRef(null); // Referring to our canvas
  const socket = useRef(null); // Ref for Socket.io connection

  const [isSocketEnabled, setIsSocketEnabled] = useState(true); // Toggle for online mode
  const [selectedTool, setSelectedTool] = useState("pen");

  const {
    canvasContext,
    currentColor,
    lineWidth,
    startDrawingFromParticularPoint,
    draw,
    drawFromSocket,
    changeColor,
    changeWidth,
    undoDrawing,
    clearDrawing,
    endDrawing,
    reDrawPreviousData,
  } = useCanvas(canvasRef, socket, isSocketEnabled, selectedTool);

  useEffect(() => {
    const cleanup = intializeSocket(
      socket,
      setIsSocketEnabled,
      drawFromSocket,
      canvasContext
    );
    return cleanup;
  }, [canvasContext]);

  return (
    <div className="flex flex-col items-center bg-gray-100 min-h-screen p-6">
      <div className="bg-white shadow-lg rounded-lg p-4">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawingFromParticularPoint}
          onMouseMove={draw}
          onMouseUp={endDrawing}
          onMouseOut={endDrawing}
          className="border border-gray-400 rounded-lg"
        />
      </div>

      {/* Toolbar */}
      <div className="bg-white shadow-md p-4 mt-4 flex flex-wrap justify-center items-center gap-4 rounded-lg w-full max-w-xl">
        {/* Color Picker */}
        {/* <div className="flex gap-2">
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
        </div> */}

        {/* Brush Size */}
        {/* <div className="flex items-center gap-2">
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
        </div> */}

        {/* Buttons */}
        {/* <div className="flex gap-2">
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
        </div> */}

        <div className="flex gap-2">
          <button
            className={`p-2 rounded ${
              selectedTool === "pen" ? "bg-gray-800" : "bg-gray-500"
            }`}
            onClick={() => setSelectedTool("pen")}
          >
            <Pencil size={18} /> Pen
          </button>
          <button
            className={`p-2 rounded ${
              selectedTool === "rectangle" ? "bg-gray-800" : "bg-gray-500"
            }`}
            onClick={() => setSelectedTool("rectangle")}
            // onClick={() => handleToolChange("rectangle")}
          >
            <Square size={18} /> Rectangle
          </button>
          <button
            className={`p-2 rounded ${
              selectedTool === "circle" ? "bg-gray-800" : "bg-gray-500"
            }`}
            // onClick={() => handleToolChange("circle")}
            onClick={() => setSelectedTool("circle")}
          >
            <Circle size={18} /> Circle
          </button>
          <button
            className={`p-2 rounded ${
              selectedTool === "line" ? "bg-gray-800" : "bg-gray-500"
            }`}
            // onClick={() => handleToolChange("line")}
            onClick={() => setSelectedTool("line")}
          >
            <Minus size={18} /> Line
          </button>
        </div>

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

        {/* Undo / Clear */}
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
