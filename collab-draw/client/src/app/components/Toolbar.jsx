"use-client";

import React, { useState } from "react";
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
} from "lucide-react";

export default function Toolbar() {
  const {
    activeTool,
    setActiveTool,
    strokeColor,
    setStrokeColor,
    strokeWidth,
    setStrokeWidth,
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

  const lineWidthOptions = [1, 3, 5, 7, 9, 10];

  return (
    <div className="absolute left-4 top-1/2 flex flex-col transform -translate-y-1/2 gap-2 bg-white shadow-xl rounded-2xl p-3">
      {tools.map((tool) => {
        return (
          <button
            key={tool.id}
            onClick={() => setActiveTool(tool.id)}
            title={tool.label}
            className={`group relative flex items-center justify-center w-15 h-15 rounded-xl border border-gray-300 text-black hover:bg-gray-500 transition-all duration-200 ${
              activeTool === tool.id ? "active" : ""
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
      <div className="mt-2">
        <span className="block text-sm text-gray-700 mb-1">Line Width</span>
        <div className="flex flex-wrap gap-1 mt-1">
          {lineWidthOptions.map((width) => (
            <button
              key={width}
              onClick={() => setStrokeWidth(width)}
              className={`w-8 h-8 rounded flex items-center justify-center border border-gray-300 text-gray-700 hover:bg-gray-100 transition-all duration-200 ${
                strokeWidth === width ? "bg-gray-200" : ""
              }`}
            >
              <Minus className="w-4 h-8" style={{ strokeWidth: width }} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
