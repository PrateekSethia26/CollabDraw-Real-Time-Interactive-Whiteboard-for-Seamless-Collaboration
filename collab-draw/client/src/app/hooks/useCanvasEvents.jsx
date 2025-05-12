import { useCallback, useEffect, useState, useRef } from "react";
import { fabric } from "fabric";
import { v4 as uuidv4 } from "uuid";
import { applySelectionStyles, assignId } from "../utils/canvasUtils";

export default function useCanvasEvents({
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
}) {
  const [isDrawing, setIsDrawing] = useState(false);
  const [activeObject, setActiveObject] = useState(null);
  const [startPoint, setStartPoint] = useState(null);
  // const [currentSelectionIds, setCurrentSelectionIds] = useState([]);
  const lastModified = useRef(new Map());

  // Handle object added to canvas
  const handleObjectAdded = useCallback(
    (e) => {
      if (!fabricCanvas) return;

      // Make sure object has an ID
      const obj = e.target;
      if (obj && !obj.id) {
        obj.id = uuidv4();
      }

      // Save canvas state after object is added
      saveCanvasState();

      // Emit to socket if needed
      if (isSocketEnabled && socketRef.current) {
        const objData = obj.toObject(["id"]);
        let type = obj.type;

        // Map fabric type to our api types
        if (type === "rect") type = "rectangle";
        if (type === "path") type = "pen";

        socketRef.current.emit("shape:draw", {
          roomId,
          type: type,
          props: objData,
        });
      }
    },
    [fabricCanvas, isSocketEnabled, roomId, saveCanvasState]
  );

  // Handle selection changes
  const handleSelectionChange = useCallback(
    (e) => {
      if (!fabricCanvas) return;
      // Apply selection styles to the active object
      const activeSelection = fabricCanvas.getActiveObject();
      if (activeSelection) {
        applySelectionStyles(activeSelection);
      }

      // Only emit selection changes when in select mode
      if (activeTool !== "select" || !isSocketEnabled || !socketRef.current)
        return;

      let selectionIds = [];

      if (activeSelection) {
        if (activeSelection.type === "activeSelection") {
          selectionIds = activeSelection
            .getObjects()
            .map((obj) => obj.id)
            .filter((id) => !!id);
        } else if (activeSelection.id) {
          selectionIds = [activeSelection.id];
        }
      }

      const sortedNew = [...selectionIds].sort();
      const sortedCurrent = [...currentSelectionIds].sort();

      if (JSON.stringify(sortedNew) !== JSON.stringify(sortedCurrent)) {
        console.log("Local selection changed. Emitting:", sortedNew);
        console.log("Socket ", socketRef.current);
        socketRef.current.emit("selection:update", sortedNew);
        setCurrentSelectionIds(selectionIds);
      }
    },
    [fabricCanvas, activeTool, isSocketEnabled, currentSelectionIds]
  );

  // Set up canvas events
  useEffect(() => {
    if (!fabricCanvas) return;

    // Mouse event handlers
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
        const text = new fabric.TextBox("Double tap to edit", {
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
        return;
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

      const isDrawingShape = ["rectangle", "circle", "line"].includes(
        activeTool
      );

      if (
        isSocketEnabled &&
        activeObject &&
        isDrawingShape &&
        socketRef?.current
      ) {
        if (!activeObject.id) {
          activeObject = assignId(activeObject);
        }

        const shapeData = activeObject.toObject(["id"]);
        socketRef.current.emit("shape:draw", {
          roomId,
          type: activeTool,
          props: shapeData,
        });
      }

      setActiveObject(null);
      fabricCanvas.renderAll();
      setIsDrawing(false);
    };

    // Handle object modification events
    const handleObjectModification = (e) => {
      if (!isSocketEnabled || !socketRef?.current || !e.target) return;

      const modifiedObj = e.target;
      const now = Date.now();

      // For single objects
      if (modifiedObj.type !== "activeSelection") {
        if (!modifiedObj.id) {
          modifiedObj.id = uuidv4();
        }

        const objData = modifiedObj.toObject(["id"]);
        lastModified.current.set(modifiedObj.id, now);

        socketRef.current.emit("shape:modify", {
          roomId,
          id: modifiedObj.id,
          props: objData,
        });
      }
      // For multiple selected objects in an active selection
      else {
        const objects = modifiedObj.getObjects();
        const matrix = modifiedObj.calcTransformMatrix();

        objects.forEach((obj) => {
          if (!obj.id) {
            obj.id = uuidv4();
          }

          // Get object's absolute position by applying the group's transformation matrix
          const newPoint = fabric.util.transformPoint(
            { x: obj.left, y: obj.top },
            matrix
          );

          // Clone the object to avoid reference issues
          const objClone = fabric.util.object.clone(obj);

          // Apply transformations from the group
          objClone.set({
            left: newPoint.x,
            top: newPoint.y,
            scaleX: obj.scaleX * modifiedObj.scaleX,
            scaleY: obj.scaleY * modifiedObj.scaleY,
            angle: obj.angle + modifiedObj.angle,
          });

          // Prepare and send object data
          const objData = objClone.toObject(["id"]);
          lastModified.current.set(obj.id, now);

          socketRef.current.emit("shape:modify", {
            roomId,
            id: obj.id,
            props: objData,
          });
        });
      }
    };

    // Path creation handler for pen tool
    const handlePathCreated = (options) => {
      let path = options.path;
      if (!path) return;

      path = assignId(path);

      if (isSocketEnabled && socketRef?.current) {
        const propsToSend = path.toObject(["id"]);
        socketRef.current.emit("shape:draw", {
          roomId,
          type: "pen",
          props: propsToSend,
        });
      }
    };

    // Register all event handlers
    fabricCanvas.on("path:created", handlePathCreated);
    fabricCanvas.on("selection:created", handleSelectionChange);
    fabricCanvas.on("selection:updated", handleSelectionChange);
    fabricCanvas.on("selection:cleared", handleSelectionChange);

    fabricCanvas.on("object:modified", handleObjectModification);
    fabricCanvas.on("object:moving", handleObjectModification);
    fabricCanvas.on("object:scaling", handleObjectModification);
    fabricCanvas.on("object:rotating", handleObjectModification);

    fabricCanvas.on("mouse:up", handleMouseUp);
    fabricCanvas.on("mouse:down", handleMouseDown);
    fabricCanvas.on("mouse:move", handleMouseMove);

    // Clean up on unmount or when dependencies change
    return () => {
      fabricCanvas.off("path:created", handlePathCreated);

      fabricCanvas.off("selection:created", handleSelectionChange);
      fabricCanvas.off("selection:updated", handleSelectionChange);
      fabricCanvas.off("selection:cleared", handleSelectionChange);

      fabricCanvas.off("object:modified", handleObjectModification);
      fabricCanvas.off("object:moving", handleObjectModification);
      fabricCanvas.off("object:scaling", handleObjectModification);
      fabricCanvas.off("object:rotating", handleObjectModification);

      fabricCanvas.off("mouse:up", handleMouseUp);
      fabricCanvas.off("mouse:down", handleMouseDown);
      fabricCanvas.off("mouse:move", handleMouseMove);
    };
  }, [
    fabricCanvas,
    activeTool,
    strokeColor,
    strokeWidth,
    isDrawing,
    activeObject,
    startPoint,
    isSocketEnabled,
    roomId,
    handleSelectionChange,
  ]);

  return {
    handleObjectAdded,
    handleSelectionChange,
  };
}
