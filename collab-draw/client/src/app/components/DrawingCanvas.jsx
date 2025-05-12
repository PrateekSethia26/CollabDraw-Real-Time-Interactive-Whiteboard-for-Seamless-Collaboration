import React, { useCallback, useEffect, useRef, useState } from "react";
import { useDrawing } from "../context/DrawingContext";
import toast from "react-hot-toast";
import { fabric } from "fabric";
import initializeSocket from "../manager/SocketManager";
import { v4 as uuidv4 } from "uuid";
import useCanvasSetup from "../hooks/useCanvasSetup";
import useCanvasHistory from "../hooks/useCanvasHistory";
import { SELECTION_STYLES } from "../constants/canvasStyles";
import useCanvasSocket from "../hooks/useCanvasSocket";
import useCanvasEvents from "../hooks/useCanvasEvents";

const assignId = (obj) => {
  if (obj && !obj.id) {
    obj.id = uuidv4();
  }
  return obj;
};

export default function DrawingCanvas({ isSocketEnabled, roomId, username }) {
  const canvasRef = useRef(null);
  const socket = useRef(null);
  const [fabricCanvas, setFabricCanvas] = useState(null);
  const [currentSelectionIds, setCurrentSelectionIds] = useState([]);

  const { activeTool, strokeWidth, strokeColor, setUndo, setClearCanvas } =
    useDrawing();

  const { history, saveCanvasState } = useCanvasHistory(fabricCanvas);

  const { socketRef } = useCanvasSocket({
    fabricCanvas,
    isSocketEnabled,
    roomId,
    username,
    setCurrentSelectionIds,
  });

  const { handleObjectAdded, handleSelectionChange } = useCanvasEvents({
    fabricCanvas,
    activeTool,
    strokeColor,
    strokeWidth,
    isSocketEnabled,
    roomId,
    saveCanvasState,
    socketRef,
    currentSelectionIds,
    setCurrentSelectionIds,
  });

  // useEffect(() => {
  //   console.log("History length from saved : ", history.length);
  // }, [history]);

  // Canvas initialization
  useCanvasSetup({
    canvasRef,
    setFabricCanvas,
    setHistory: (state) => saveCanvasState(state),
    SELECTION_STYLES,
    activeTool,
  });

  useEffect(() => {
    if (!fabricCanvas) return;

    const undoCanvas = () => {
      if (!fabricCanvas || history.length <= 1) {
        console.log("Cannot undo");
        return;
      }

      console.log("🔁 Undo clicked");

      const prevState = history[history.length - 1];
      const socketPrevState = history[history.length - 2];

      // Disable modification listeners during load to prevent loops
      fabricCanvas.off("object:added", saveCanvasState);
      fabricCanvas.off("object:modified", saveCanvasState);
      fabricCanvas.off("object:removed", saveCanvasState);

      fabricCanvas.loadFromJSON(prevState, () => {
        fabricCanvas.renderAll();
      });

      // Update history after applying changes
      // setHistory((prev) => prev.slice(0, -1));

      // history.pop();

      // Update history after applying changes
      saveCanvasState(socketPrevState);

      if (isSocketEnabled && socket?.current) {
        socket.current.emit("canvas:undo", { state: socketPrevState });
      }

      // Re-enable listeners after load and state update
      fabricCanvas.on("object:added", saveCanvasState);
      fabricCanvas.on("object:modified", saveCanvasState);
      fabricCanvas.on("object:removed", saveCanvasState);
    };

    const clearCanvasConfirm = () => {
      if (!fabricCanvas) return;
      const confirmClear = window.confirm(
        "Are you sure you want to clear the canvas ?"
      );
      if (confirmClear) {
        fabricCanvas.clear();

        fabricCanvas.setBackgroundColor("#ffffff", () => {
          saveCanvasState(null);
          fabricCanvas.renderAll();
        });

        if (isSocketEnabled && socket?.current) {
          socket.current.emit("canvas:clear", { state: null });
        }
      }
    };

    setUndo(() => undoCanvas);
    setClearCanvas(() => clearCanvasConfirm);
  }, [fabricCanvas, history.length, isSocketEnabled, roomId, socketRef]);

  useEffect(() => {
    if (!fabricCanvas) return;

    // Register state-preserving event handlers
    fabricCanvas.on("object:added", saveCanvasState);
    fabricCanvas.on("object:modified", saveCanvasState);
    fabricCanvas.on("object:removed", saveCanvasState);

    fabricCanvas.isDrawingMode =
      activeTool === "pen" || activeTool === "eraser";

    if (activeTool === "pen") {
      fabricCanvas.freeDrawingBrush.color = strokeColor;
      fabricCanvas.freeDrawingBrush.width = strokeWidth;
    } else if (activeTool === "eraser") {
      fabricCanvas.freeDrawingBrush.color = "#ffffff";
      fabricCanvas.freeDrawingBrush.width = 40;
    }

    if (activeTool === "select") {
      fabricCanvas.selection = true;
      fabricCanvas.getObjects().forEach((obj) => {
        obj.selectable = true;
        obj.evented = true;
      });

      fabricCanvas.defaultCursor = "default";
      fabricCanvas.hoverCursor = "move";
    } else {
      fabricCanvas.selection = false;
      fabricCanvas.getObjects().forEach((obj) => {
        obj.selectable = false;
        obj.evented = false;
      });

      fabricCanvas.discardActiveObject();
      fabricCanvas.requestRenderAll();
    }

    return () => {
      fabricCanvas.off("object:added", saveCanvasState);
      fabricCanvas.off("object:modified", saveCanvasState);
      fabricCanvas.off("object:removed", saveCanvasState);
    };
  }, [fabricCanvas, activeTool, strokeColor, strokeWidth, saveCanvasState]);

  return (
    <div className="flex-1 overflow-hidden drawing-area relative">
      <canvas ref={canvasRef} className="absolute" />
      {/* Tool indicator will be inserted here via ref */}
    </div>
  );
}
