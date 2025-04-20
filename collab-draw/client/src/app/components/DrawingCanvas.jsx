import React, { useCallback, useEffect, useRef, useState } from "react";
import { useDrawing } from "../context/DrawingContext";
import toast from "react-hot-toast";
import { fabric } from "fabric";
import intializeSocket from "../manager/SocketManager";

export default function DrawingCanvas({ isSocketEnabled }) {
  const canvasRef = useRef(null);
  const socket = useRef(null);
  const [fabricCanvas, setFabricCanvas] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [activeObject, setActiveObject] = useState(null);
  const [startPoint, setStartPoint] = useState(null);
  const [history, setHistory] = useState([]);

  const { activeTool, strokeWidth, strokeColor, setUndo, setClearCanvas } =
    useDrawing();

  const drawFromSocket = useCallback(
    (data) => {
      if (!fabricCanvas || !data?.props || !data?.type) return;
      let shape = null;

      switch (data.type) {
        case "rectangle":
          shape = new fabric.Rect({ ...data.props });
          break;

        case "circle":
          shape = new fabric.Circle({ ...data.props });
          break;

        case "line":
          shape = new fabric.Line(
            [data.props.x1, data.props.y1, data.props.x2, data.props.y2],
            { ...data.props }
          );
          break;

        case "pen":
          shape = new fabric.Path(data.props.path, { ...data.props });
          break;

        case "select":
          shape = data.props;

        default:
          console.warn("Unknown shape type from socket:", data.type);
          return;
      }

      if (shape) {
        fabricCanvas.add(shape);
        fabricCanvas.renderAll();
      }
    },
    [fabricCanvas]
  );

  const saveCanvasState = useCallback(() => {
    if (fabricCanvas) {
      const newState = JSON.stringify(fabricCanvas.toJSON());
      setHistory((prev) => {
        const updated = [...prev, newState];

        return updated;
      });
    }
  }, [fabricCanvas]);

  useEffect(() => {
    const cleanup = intializeSocket(
      socket,
      isSocketEnabled,
      drawFromSocket,
      fabricCanvas
    );
    return cleanup;
  }, [isSocketEnabled, fabricCanvas]);

  useEffect(() => {
    console.log("History length from saved : ", history.length);
  }, [history]);

  useEffect(() => {
    if (!canvasRef.current) {
      throw new error("Canvas is not defined");
    }

    // intailize canvas
    const canvas = new fabric.Canvas(canvasRef.current, {
      isDrawingMode: activeTool === "pen",
      width: window.innerWidth - 330,
      height: window.innerHeight - 100,
      backgroundColor: "#ffffff",
    });

    setFabricCanvas(canvas);

    const windowResize = () => {
      canvas.setDimensions({
        width: window.innerWidth - 330,
        height: window.innerHeight - 100,
      });
      canvas.renderAll();
    };
    window.addEventListener("resize", windowResize);

    setTimeout(() => {
      const intialState = JSON.stringify(canvas.toJSON());
      setHistory([intialState]);
    }, 100);

    toast.success("Canvas ready! Start drawing!");

    return () => {
      canvas.dispose();
      window.removeEventListener("resize", windowResize);
    };
  }, []);

  useEffect(() => {
    if (!fabricCanvas) return;

    const undoCanvas = () => {
      if (!fabricCanvas || history.length <= 0) {
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
      history.pop();

      if (isSocketEnabled) {
        socket?.current?.emit("canvas:undo", { state: socketPrevState });
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
          setHistory([]);
          fabricCanvas.renderAll();
        });

        if (isSocketEnabled) {
          socket?.current?.emit("canvas:clear", { state: history });
        }
      }
    };

    setUndo(() => undoCanvas);
    setClearCanvas(() => clearCanvasConfirm);

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
      var sel = new fabric.ActiveSelection(fabricCanvas.getObjects(), {
        canvas: fabricCanvas,
      });
      fabricCanvas.setActiveObject(sel);
      fabricCanvas.discardActiveObject();
      fabricCanvas.requestRenderAll();
    }

    // Clear mouse activities
    fabricCanvas.off("mouse:up");
    fabricCanvas.off("mouse:down");
    fabricCanvas.off("mouse:move");
    fabricCanvas.off("path:created");

    fabricCanvas.on("path:created", (options) => {
      const path = options.path;
      if (!path) return;

      if (isSocketEnabled) {
        socket?.current?.emit("shape:draw", {
          type: "pen",
          props: path.toObject(),
        });
      }
    });

    const handleMouseDown = (options) => {
      if (!fabricCanvas) return; // prevent memory leak

      const pointer = fabricCanvas.getPointer(options.e);
      setStartPoint({ x: pointer.x, y: pointer.y });

      if (activeTool === "rectangle") {
        const rect = new fabric.Rect({
          left: pointer.x,
          top: pointer.y,
          width: 0,
          height: 0,
          fill: "transparent",
          stroke: strokeColor,
          strokeWidth,
        });
        fabricCanvas.add(rect);
        fabricCanvas.setActiveObject(rect);
        setActiveObject(rect);
        setIsDrawing(true);
      } else if (activeTool === "circle") {
        const circle = new fabric.Circle({
          left: pointer.x,
          top: pointer.y,
          radius: 0,
          fill: "transparent",
          stroke: strokeColor,
          strokeWidth,
        });

        fabricCanvas.add(circle);
        fabricCanvas.setActiveObject(circle);
        setActiveObject(circle);
        setIsDrawing(true);
      } else if (activeTool === "line") {
        const line = new fabric.Line(
          [pointer.x, pointer.y, pointer.x, pointer.y],
          {
            stroke: strokeColor,
            strokeWidth,
          }
        );

        fabricCanvas.add(line);
        fabricCanvas.setActiveObject(line);
        setActiveObject(line);
        setIsDrawing(true);
      } else if (activeTool === "text") {
        const text = new fabric.TextBox({
          left: pointer.x,
          top: pointer.y,
          fill: strokeColor,
          fontSize: strokeWidth,
          fontFamily: "Arial",
        });
        fabricCanvas.add(text);
      }
    };

    const handleMouseMove = (options) => {
      if (!isDrawing || !fabricCanvas || !activeObject || !startPoint) return;

      const pointer = fabricCanvas.getPointer(options.e);
      if (activeTool === "rectangle" && activeObject.type === "rect") {
        const width = Math.abs(pointer.x - startPoint.x);
        const height = Math.abs(pointer.y - startPoint.y);

        if (pointer.x < startPoint.x) {
          activeObject.set({ left: pointer.x });
        }
        if (pointer.y < startPoint.y) {
          activeObject.set({ top: pointer.y });
        }

        activeObject.set({ width, height });
        fabricCanvas.renderAll();
      } else if (activeTool === "circle" && activeObject.type === "circle") {
        const dx = pointer.x - startPoint.x;
        const dy = pointer.y - startPoint.y;
        const radius = Math.sqrt(dx * dx + dy * dy);

        // Calculate the new left and top to center the circle at the start point
        const left = startPoint.x - radius;
        const top = startPoint.y - radius;

        activeObject.set({ radius, left, top });
        fabricCanvas.renderAll();
      } else if (activeTool === "line" && activeObject.type === "line") {
        activeObject.set({ x2: pointer.x, y2: pointer.y });
        fabricCanvas.renderAll();
      }
    };

    const handleMouseUp = () => {
      if (!fabricCanvas) return;

      if (isSocketEnabled) {
        if (activeObject === "pen") return;
        const shapeData = activeObject?.toObject();
        socket?.current?.emit("shape:draw", {
          type: activeTool,
          props: shapeData,
        });
      }
      setActiveObject(null);
      fabricCanvas.discardActiveObject();
      setIsDrawing(false);

      fabricCanvas.renderAll();
    };

    fabricCanvas.on("mouse:up", handleMouseUp);
    fabricCanvas.on("mouse:down", handleMouseDown);
    fabricCanvas.on("mouse:move", handleMouseMove);

    return () => {
      fabricCanvas.off("object:added", saveCanvasState);
      fabricCanvas.off("object:modified", saveCanvasState);
      fabricCanvas.off("object:removed", saveCanvasState);

      fabricCanvas.off("mouse:up", handleMouseUp);
      fabricCanvas.off("mouse:down", handleMouseDown);
      fabricCanvas.off("mouse:move", handleMouseMove);
      fabricCanvas.off("path:created");
    };
  }, [
    activeTool,
    isDrawing,
    strokeColor,
    strokeWidth,
    fabricCanvas,
    startPoint,
    activeObject,
    setUndo,
    setClearCanvas,
  ]);

  return (
    <div className="flex-1 overflow-hidden drawing-area relative">
      <canvas ref={canvasRef} className="absolute" />
    </div>
  );
}
