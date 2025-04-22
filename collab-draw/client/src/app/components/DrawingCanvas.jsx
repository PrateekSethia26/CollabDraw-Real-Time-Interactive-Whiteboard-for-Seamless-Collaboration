import React, { useCallback, useEffect, useRef, useState } from "react";
import { useDrawing } from "../context/DrawingContext";
import toast from "react-hot-toast";
import { fabric } from "fabric";
import initializeSocket from "../manager/SocketManager";
import { v4 as uuidv4 } from "uuid";

const assignId = (obj) => {
  if (obj && !obj.id) {
    obj.id = uuidv4();
  }
  return obj;
};

export default function DrawingCanvas({ isSocketEnabled }) {
  const canvasRef = useRef(null);
  const toolIndicatorRef = useRef(null);
  const socket = useRef(null);
  const [fabricCanvas, setFabricCanvas] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [activeObject, setActiveObject] = useState(null);
  const [startPoint, setStartPoint] = useState(null);
  const [history, setHistory] = useState([]);
  const [currentSelectionIds, setCurrentSelectionIds] = useState([]);
  const lastModified = useRef(new Map());  // Track last modified timestamps to prevent loops

  const { activeTool, strokeWidth, strokeColor, setUndo, setClearCanvas } = useDrawing();

  // Selection style constants
  const SELECTION_COLOR = 'rgba(17, 119, 255, 0.3)';
  const SELECTION_BORDER_COLOR = 'rgb(17, 119, 255)';
  const SELECTION_CORNER_COLOR = 'rgb(17, 119, 255)';

  // Draw object from socket
  const drawFromSocket = useCallback(
    (data) => {
      if (!fabricCanvas || !data?.props || !data?.type) return;
      let shape = null;

      const propsWithId = { ...data.props };

      switch (data.type) {
        case "rectangle":
          shape = new fabric.Rect(propsWithId);
          break;

        case "circle":
          shape = new fabric.Circle(propsWithId);
          break;

        case "line":
          shape = new fabric.Line(
            [data.props.x1, data.props.y1, data.props.x2, data.props.y2],
            propsWithId
          );
          break;

        case "pen":
          shape = new fabric.Path(data.props.path, propsWithId);
          if (propsWithId && shape.id) shape.id = propsWithId;
          break;

        default:
          console.warn("Unknown shape type from socket:", data.type);
          return;
      }

      if (shape) {
        if (!shape.id) {
          console.log("Shape received from socket is missing ID:", data.type);
        }

        fabricCanvas.add(shape);
        fabricCanvas.renderAll();
      }
    },
    [fabricCanvas]
  );
  
  // Handle object modifications from socket
  const modifyFromSocket = useCallback((data) => {
    if (!fabricCanvas || !data || !data.id || !data.props) {
      console.warn("modifyFromSocket: Invalid data received", data);
      return;
    }

    const { id, props } = data;
    const now = Date.now();
    
    // Avoid processing our own modifications that just came back to us
    if (lastModified.current.has(id)) {
      const lastTime = lastModified.current.get(id);
      if (now - lastTime < 1000) { // Within 1 second, likely our own
        return;
      }
    }
    
    const objectToModify = fabricCanvas.getObjects().find(obj => obj.id === id || (obj.id && obj.id.id === id));
    if (objectToModify) {
      console.log(`Applying modification from socket to object ${id}`);
      
      // Temporarily disable events to prevent loops
      const originalEvented = objectToModify.evented;
      objectToModify.set('evented', false);
      
      // Apply properties from socket
      objectToModify.set(props);
      objectToModify.setCoords();
      
      // Re-enable events
      objectToModify.set('evented', originalEvented);
      
      fabricCanvas.renderAll();
    }
  }, [fabricCanvas]);

  const saveCanvasState = useCallback(() => {
    if (fabricCanvas) {
      const newState = JSON.stringify(fabricCanvas.toJSON(['id']));
      setHistory((prev) => {
        const updated = [...prev, newState];
        return updated;
      });
    }
  }, [fabricCanvas]);

  // Update tool indicator UI
  const updateToolIndicator = useCallback(() => {
    if (!toolIndicatorRef.current) return;
    
    const tools = ['select', 'rectangle', 'circle', 'line', 'pen', 'eraser', 'text'];
    
    toolIndicatorRef.current.innerHTML = `
      <div class="tool-indicator p-2 bg-gray-800 text-white rounded absolute top-4 right-4 z-10">
        Active Tool: <span class="font-bold">${activeTool.charAt(0).toUpperCase() + activeTool.slice(1)}</span>
      </div>
    `;
  }, [activeTool]);

  // Apply selection styles to objects
  const applySelectionStyles = useCallback((obj) => {
    if (!obj) return;
    
    if (obj.type === 'activeSelection') {
      obj.set({
        borderColor: SELECTION_BORDER_COLOR,
        cornerColor: SELECTION_CORNER_COLOR,
        cornerSize: 10,
        transparentCorners: false,
        cornerStyle: 'circle',
        borderDashArray: [3, 3],
      });
    } else {
      obj.set({
        borderColor: SELECTION_BORDER_COLOR,
        cornerColor: SELECTION_CORNER_COLOR,
        cornerSize: 8,
        transparentCorners: false,
        cornerStyle: 'circle',
        borderDashArray: [3, 3],
      });
    }
  }, []);

  useEffect(() => {
    // Fixed parameter order and names to match the SocketManager implementation
    const cleanup = initializeSocket(
      socket,
      isSocketEnabled,
      drawFromSocket,
      modifyFromSocket,
      fabricCanvas,
      (selectionIds) => {
        if (!fabricCanvas || !Array.isArray(selectionIds)) return;
        
        const objectsToSelect = fabricCanvas
          .getObjects()
          .filter((obj) => obj.id && selectionIds.includes(obj.id));

        fabricCanvas.discardActiveObject();
        if (objectsToSelect.length === 1) {
          const obj = objectsToSelect[0];
          fabricCanvas.setActiveObject(obj);
          applySelectionStyles(obj);
        } else if (objectsToSelect.length > 1) {
          const sel = new fabric.ActiveSelection(objectsToSelect, {
            canvas: fabricCanvas,
          });
          applySelectionStyles(sel);
          fabricCanvas.setActiveObject(sel);
        }

        fabricCanvas.requestRenderAll();
        console.log("Received selection update, setting state:", selectionIds);
        setCurrentSelectionIds(selectionIds);
      }
    );
    return cleanup;
  }, [isSocketEnabled, fabricCanvas, drawFromSocket, modifyFromSocket, applySelectionStyles]);

  useEffect(() => {
    console.log("History length from saved : ", history.length);
  }, [history]);

  useEffect(() => {
    if (!canvasRef.current) {
      console.error("Canvas is not defined");
      return;
    }

    // Initialize canvas
    const canvas = new fabric.Canvas(canvasRef.current, {
      isDrawingMode: activeTool === "pen",
      width: window.innerWidth - 330,
      height: window.innerHeight - 100,
      backgroundColor: "#ffffff",
      // Set default selection styles
      selectionColor: SELECTION_COLOR,
      selectionBorderColor: SELECTION_BORDER_COLOR,
      selectionLineWidth: 1,
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
      const initialState = JSON.stringify(canvas.toJSON(['id']));
      setHistory([initialState]);
    }, 100);

    toast.success("Canvas ready! Start drawing!");

    return () => {
      canvas.dispose();
      window.removeEventListener("resize", windowResize);
    };
  }, []);

  // Create tool indicator div
  useEffect(() => {
    if (!toolIndicatorRef.current) {
      const indicatorDiv = document.createElement('div');
      indicatorDiv.className = 'tool-indicator-container';
      const canvasContainer = canvasRef.current?.parentElement;
      if (canvasContainer) {
        canvasContainer.appendChild(indicatorDiv);
        toolIndicatorRef.current = indicatorDiv;
      }
    }

    // Update tool indicator when active tool changes
    updateToolIndicator();

    return () => {
      if (toolIndicatorRef.current) {
        toolIndicatorRef.current.remove();
      }
    };
  }, [activeTool, updateToolIndicator]);

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
      setHistory(prev => prev.slice(0, -1));

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
          setHistory([]);
          fabricCanvas.renderAll();
        });

        if (isSocketEnabled && socket?.current) {
          socket.current.emit("canvas:clear", { state: null });
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

    // Clear mouse activities
    fabricCanvas.off("mouse:up");
    fabricCanvas.off("mouse:down");
    fabricCanvas.off("mouse:move");
    fabricCanvas.off("path:created");

    fabricCanvas.off("selection:created");
    fabricCanvas.off("selection:updated");
    fabricCanvas.off("selection:cleared");
    fabricCanvas.off("object:modified");
    fabricCanvas.off("object:moving");
    fabricCanvas.off("object:scaling");
    fabricCanvas.off("object:rotating");

    fabricCanvas.on("path:created", (options) => {
      console.log("Path being created");
      let path = options.path;
      console.log("Path from pen", path);
      if (!path) {
        return;
      }
      path = assignId(path);

      if (isSocketEnabled && socket?.current) {
        const propsToSend = path.toObject(["id"]);
        socket.current.emit("shape:draw", {
          type: "pen",
          props: propsToSend,
        });
      }
    });

    const handleMouseDown = (options) => {
      if (!fabricCanvas) return;

      const pointer = fabricCanvas.getPointer(options.e);
      setStartPoint({ x: pointer.x, y: pointer.y });

      let objectToAdd = null;

      if (activeTool === "rectangle") {
        objectToAdd = new fabric.Rect({
          left: pointer.x,
          top: pointer.y,
          width: 0,
          height: 0,
          fill: "transparent",
          stroke: strokeColor,
          strokeWidth,
        });
      } else if (activeTool === "circle") {
        objectToAdd = new fabric.Circle({
          left: pointer.x,
          top: pointer.y,
          radius: 0,
          fill: "transparent",
          stroke: strokeColor,
          strokeWidth,
        });
      } else if (activeTool === "line") {
        objectToAdd = new fabric.Line(
          [pointer.x, pointer.y, pointer.x, pointer.y],
          {
            stroke: strokeColor,
            strokeWidth,
          }
        );
      } else if (activeTool === "text") {
        const text = new fabric.TextBox("", {
          left: pointer.x,
          top: pointer.y,
          fill: strokeColor,
          fontSize: strokeWidth,
          fontFamily: "Arial",
          id: uuidv4(),
        });
        fabricCanvas.add(text);
        fabricCanvas.setActiveObject(text);
        applySelectionStyles(text);
        text.enterEditing();
        setActiveObject(null);
        setIsDrawing(false);
      }

      if (objectToAdd) {
        objectToAdd = assignId(objectToAdd);
        fabricCanvas.add(objectToAdd);
        setActiveObject(objectToAdd);
        setIsDrawing(true);
      }
    };

    const handleMouseMove = (options) => {
      if (!isDrawing || !fabricCanvas || !activeObject || !startPoint) return;

      const pointer = fabricCanvas.getPointer(options.e);
      if (activeTool === "rectangle") {
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
      } else if (activeTool === "circle") {
        const dx = pointer.x - startPoint.x;
        const dy = pointer.y - startPoint.y;
        const radius = Math.sqrt(dx * dx + dy * dy);

        const left = startPoint.x - radius;
        const top = startPoint.y - radius;

        activeObject.set({ radius, left, top });
        fabricCanvas.renderAll();
      } else if (activeTool === "line") {
        activeObject.set({ x2: pointer.x, y2: pointer.y });
        fabricCanvas.renderAll();
      }
    };

    const handleMouseUp = () => {
      if (!fabricCanvas) return;
      
      const isDrawingShape = ["rectangle", "circle", "line"].includes(activeTool);

      if (isSocketEnabled && activeObject && isDrawingShape && socket?.current) {
        console.log("Active obj ", activeObject);
        if (!activeObject.id) {
          console.warn("Object missing ID before sending:", activeObject.type);
          activeObject = assignId(activeObject);
        }
        
        const shapeData = activeObject.toObject(["id"]);
        console.log("shapeData", shapeData);
        socket.current.emit("shape:draw", {
          type: activeTool,
          props: shapeData,
        });
      }

      setActiveObject(null);
      fabricCanvas.renderAll();
      setIsDrawing(false);
    };

    const handleSelectionChange = (e) => {
      if (!fabricCanvas) return;
      
      // Apply selection styles to the active object
      const activeSelection = fabricCanvas.getActiveObject();
      if (activeSelection) {
        applySelectionStyles(activeSelection);
      }
      
      // Only emit selection changes when in select mode
      if (activeTool !== "select" || !isSocketEnabled || !socket.current) return;
      
      let selectionIds = [];
      
      if (activeSelection) {
        if (activeSelection.type === 'activeSelection') {
          selectionIds = activeSelection.getObjects()
            .map(obj => obj.id)
            .filter(id => !!id);
        } else if (activeSelection.id) {
          selectionIds = [activeSelection.id];
        }
      }

      const sortedNew = [...selectionIds].sort();
      const sortedCurrent = [...currentSelectionIds].sort();

      if (JSON.stringify(sortedNew) !== JSON.stringify(sortedCurrent)) {
        console.log("Local selection changed. Emitting:", sortedNew);
        socket.current.emit("selection:update", sortedNew);
        setCurrentSelectionIds(selectionIds);
      }
    };

    // Improved object modification handlers
    
    // Handle all transformation events
    const handleObjectModification = (e) => {
      if (!isSocketEnabled || !socket?.current || !e.target) return;
      
      const modifiedObj = e.target;
      const now = Date.now();
      
      // For single objects
      if (modifiedObj.type !== 'activeSelection') {
        if (!modifiedObj.id) {
          modifiedObj.id = uuidv4();
        }
        
        const objData = modifiedObj.toObject(['id']);
        lastModified.current.set(modifiedObj.id, now);
        
        socket.current.emit("shape:modify", {
          id: modifiedObj.id,
          props: objData
        });
      } 
      // For multiple selected objects in an active selection
      else {
        const objects = modifiedObj.getObjects();
        
        // Calculate transformation matrix from the active selection
        const matrix = modifiedObj.calcTransformMatrix();
        
        objects.forEach(obj => {
          if (!obj.id) {
            obj.id = uuidv4();
          }
          
          // Get object's absolute position by applying the group's transformation matrix
          const newPoint = fabric.util.transformPoint({
            x: obj.left, 
            y: obj.top
          }, matrix);
          
          // Clone the object to avoid reference issues
          const objClone = fabric.util.object.clone(obj);
          
          // Apply transformations from the group
          objClone.set({
            left: newPoint.x,
            top: newPoint.y,
            scaleX: obj.scaleX * modifiedObj.scaleX,
            scaleY: obj.scaleY * modifiedObj.scaleY,
            angle: obj.angle + modifiedObj.angle
          });
          
          // Prepare and send object data
          const objData = objClone.toObject(['id']);
          lastModified.current.set(obj.id, now);
          
          socket.current.emit("shape:modify", {
            id: obj.id,
            props: objData
          });
        });
      }
    };

    // Apply different handlers for different modification types for better control
    fabricCanvas.on("object:modified", handleObjectModification);
    fabricCanvas.on("object:moving", handleObjectModification);
    fabricCanvas.on("object:scaling", handleObjectModification);
    fabricCanvas.on("object:rotating", handleObjectModification);
    
    fabricCanvas.on("selection:created", handleSelectionChange);
    fabricCanvas.on("selection:updated", handleSelectionChange);
    fabricCanvas.on("selection:cleared", handleSelectionChange);
    
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
      
      fabricCanvas.off("selection:created", handleSelectionChange);
      fabricCanvas.off("selection:updated", handleSelectionChange);
      fabricCanvas.off("selection:cleared", handleSelectionChange);
      
      fabricCanvas.off("object:modified", handleObjectModification);
      fabricCanvas.off("object:moving", handleObjectModification);
      fabricCanvas.off("object:scaling", handleObjectModification);
      fabricCanvas.off("object:rotating", handleObjectModification);
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
    saveCanvasState,
    isSocketEnabled,
    currentSelectionIds,
    applySelectionStyles,
  ]);

  return (
    <div className="flex-1 overflow-hidden drawing-area relative">
      <canvas ref={canvasRef} className="absolute" />
      {/* Tool indicator will be inserted here via ref */}
    </div>
  );
}