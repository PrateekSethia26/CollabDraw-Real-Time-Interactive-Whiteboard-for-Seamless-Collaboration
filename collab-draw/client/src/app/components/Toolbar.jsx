"use client";

import React, { useEffect, useState } from "react";
import { useDrawing } from "../context/DrawingContext";

import {
  MousePointer,
  Pen,
  Square,
  Circle,
  Type,
  Eraser,
  MoveRight,
  Minus,
  RotateCcw,
  Trash2,
} from "lucide-react";

export default function Toolbar() {
  const {
    activeTool,
    setActiveTool,
    strokeColor,
    setStrokeColor,
    strokeWidth,
    setStrokeWidth,
    undo,
    clearCanvas,
  } = useDrawing();
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showLineWidthPicker, setShowLineWidthPicker] = useState(false);

  const tools = [
    { id: "select", icon: MousePointer, label: "Select" },
    { id: "pen", icon: Pen, label: "Pen" },
    { id: "eraser", icon: Eraser, label: "Eraser" },
    { id: "rectangle", icon: Square, label: "Rectangle" },
    { id: "circle", icon: Circle, label: "Circle" },
    { id: "line", icon: MoveRight, label: "Line" },
    { id: "text", icon: Type, label: "Text" },
  ];

  return (
    <div className="absolute left-4 top-1/2 flex flex-col transform -translate-y-1/2 gap-2 bg-white shadow-xl rounded-2xl p-3">
      {tools.map((tool) => {
        return (
          <button
            key={tool.id}
            onClick={() => setActiveTool(tool.id)}
            title={tool.label}
            className={`group relative flex items-center justify-center w-15 h-15 rounded-xl border border-gray-300 text-black hover:bg-gray-500 transition-all duration-200  ${
              activeTool === tool.id
                ? "bg-blue-500 text-white"
                : "hover:bg-gray-500"
            }`}
          >
            <tool.icon className="w-5 h-5" />
            <span className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              {tool.label}
            </span>
          </button>
        );
      })}

      {/* For color */}
      <div className="relative mt-2">
        <button
          onClick={() => setShowColorPicker(!showColorPicker)}
          className="group relative flex items-center justify-center w-15 h-15 rounded-xl border border-gray-300 text-black hover:bg-gray-500 transition-all duration-200"
        >
          <div
            className="w-5 h-5 rounded-full border border-gray-400"
            style={{ backgroundColor: strokeColor }}
          ></div>
          <span className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            More Colors
          </span>
        </button>
        {showColorPicker && (
          <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 p-2 bg-white border border-gray-300 rounded-lg shadow-lg">
            <input
              type="color"
              value={strokeColor}
              onChange={(e) => setStrokeColor(e.target.value)}
              className="w-10 h-10 border-none p-0 bg-transparent cursor-pointer"
            />
          </div>
        )}
      </div>

      {/* For Line Width */}
      <div className="relative mt-2">
        <button
          onClick={() => setShowLineWidthPicker(!showLineWidthPicker)}
          className="group relative flex items-center justify-center w-15 h-15 rounded-xl border border-gray-300 text-black hover:bg-gray-500 transition-all duration-200"
        >
          <Minus className="w-5 h-8" style={{ strokeWidth: strokeWidth }}>
            {strokeWidth}
          </Minus>
          <span className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            Line Width
          </span>
        </button>

        {showLineWidthPicker && (
          <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 p-2 bg-white border border-gray-300 rounded-lg shadow-lg w-28">
            <input
              type="range"
              min={1}
              max={50}
              value={strokeWidth}
              onChange={(e) => setStrokeWidth(Number(e.target.value))}
              className="w-full"
            />
            <div className="text-center text-sm mt-1">{strokeWidth}px</div>
          </div>
        )}
      </div>

      {/* Undo Option */}
      <button
        onClick={undo}
        title="undo"
        className="group relative flex items-center justify-center w-15 h-15 rounded-xl  border border-gray-300 text-black hover:bg-gray-500 transition-all duration-200 mt-2"
      >
        <RotateCcw className="w-5 h-5" />
        <span className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          Undo
        </span>
      </button>

      {/* Clear Canvas Option */}
      <button
        onClick={clearCanvas}
        title="clear Canvas"
        className="group relative flex items-center justify-center w-15 h-15 rounded-xl  border border-gray-300 text-black hover:bg-gray-500 transition-all duration-200 mt-2"
      >
        <Trash2 className="w-5 h-5" />
        <span className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          Clear
        </span>
      </button>
    </div>
  );
}
