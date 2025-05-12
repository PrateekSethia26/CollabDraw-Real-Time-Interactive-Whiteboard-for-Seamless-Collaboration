import { useEffect, useRef, useCallback } from "react";
import initializeSocket from "../manager/SocketManager";
import { applySelectionStyles } from "../utils/canvasUtils";
import { fabric } from "fabric";

export default function useCanvasSocket({
  fabricCanvas,
  isSocketEnabled,
  roomId,
  username,
  setCurrentSelectionIds,
}) {
  const socketRef = useRef(null);
  const lastModified = useRef(new Map()); // Track last modified timestamps

  // Handle object drawing from socket
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
  const modifyFromSocket = useCallback(
    (data) => {
      if (!fabricCanvas || !data || !data.id || !data.props) {
        console.warn("modifyFromSocket: Invalid data received", data);
        return;
      }

      const { id, props } = data;
      const now = Date.now();

      // Write the logic differently Line 75 -81
      // Avoid processing our own modifications that just came back to us
      if (lastModified.current.has(id)) {
        const lastTime = lastModified.current.get(id);
        if (now - lastTime < 1000) {
          // Within 1 second, likely our own
          return;
        }
      }

      const objectToModify = fabricCanvas
        .getObjects()
        .find((obj) => obj.id === id || (obj.id && obj.id.id === id));

      if (objectToModify) {
        console.log(`Applying modification from socket to object ${id}`);

        // Temporarily disable events to prevent loops
        const originalEvented = objectToModify.evented;
        objectToModify.set("evented", false);

        // Apply properties from socket
        objectToModify.set(props);
        objectToModify.setCoords();

        // Re-enable events
        objectToModify.set("evented", originalEvented);

        fabricCanvas.renderAll();
      }
    },
    [fabricCanvas]
  );

  // Handle selection updates from remote users
  const handleRemoteSelection = useCallback(
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
    },
    [fabricCanvas]
  );

  // Initialize socket connection
  useEffect(() => {
    const cleanup = initializeSocket(
      socketRef,
      isSocketEnabled,
      drawFromSocket,
      modifyFromSocket,
      fabricCanvas,
      roomId,
      username,
      handleRemoteSelection
    );

    return cleanup;
  }, [
    isSocketEnabled,
    fabricCanvas,
    drawFromSocket,
    modifyFromSocket,
    applySelectionStyles,
    roomId,
    username,
  ]);

  // Join room when ready
  useEffect(() => {
    if (isSocketEnabled && roomId && socketRef.current) {
      socketRef.current.emit("join-room", { roomId, username });
    }
  }, [isSocketEnabled, roomId, username]);

  return { socketRef, lastModified };
}
