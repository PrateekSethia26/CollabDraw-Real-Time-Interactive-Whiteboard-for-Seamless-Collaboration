import { useState, useRef, useEffect } from "react";

const useCanvas = (canvasRef, socket, isSocketEnabled, tool) => {
  const [canvasContext, setCanvasContext] = useState(null); // for storing drawing context
  const [drawing, setDrawing] = useState(false);
  const [currentColor, setCurrentColor] = useState("black");
  const [lineWidth, setLineWidth] = useState(3);
  const [drawingActions, setDrawingActions] = useState([]); // Track our drawing history
  const [currentPath, setCurrentPath] = useState([]); // Path currently being drawn

  const [startPos, setStartPos] = useState(null);

  useEffect(() => {
    console.log(tool);
  }, [tool]);

  useEffect(() => {
    try {
      if (!canvasRef.current) {
        throw new Error(
          "Canvas reference is not initialized. Ensure the canvas element is properly rendered."
        );
      }

      // Checking canvasRef is available then set these properties to canvasRef
      const canvas = canvasRef.current;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        throw new Error("Failed to get 2D context from canvas.");
      }

      ctx.strokeStyle = currentColor;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = "round";
      setCanvasContext(ctx);
      reDrawPreviousData(ctx); // To redraw previous drawing actions
    } catch (error) {
      console.log(error.message);
    }
  }, []);

  useEffect(() => {
    console.log("Canvas Context in useEffect:", canvasContext);
  }, [canvasContext]);

  // Function to handle when user start drawing

  const startDrawing = (e) => {
    // if (canvasContext) {
    //   canvasContext.beginPath(); // Creates new Path if context present
    //   canvasContext.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    //   setDrawing(true);
    // }

    if (!canvasContext) return;
    setDrawing(true);
    const { offsetX, offsetY } = e.nativeEvent;
    setStartPos({ x: offsetX, y: offsetY });

    if (tool === "pen") {
      canvasContext.beginPath(); // Creates new Path if context present
      canvasContext.moveTo(offsetX, offsetY);
    }
  };

  const draw = (e) => {
    // if (!drawing || !canvasContext) return; // If the user is not actively drawing, exit the function.
    // // If drawing then
    // if (canvasContext) {
    //   canvasContext.strokeStyle = currentColor;
    //   canvasContext.lineWidth = lineWidth;
    //   canvasContext.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY); // Extend the path to the new cursor position.
    //   canvasContext.stroke(); // Render the line on the canvas.
    //   setCurrentPath([
    //     ...currentPath,
    //     { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY },
    //   ]); // Update the current path state with the new point.

    //   if (isSocketEnabled) {
    //     socket.current.emit("draw-data", {
    //       x: e.nativeEvent.offsetX,
    //       y: e.nativeEvent.offsetY,
    //       color: currentColor,
    //       lineWidth: lineWidth,
    //     });
    //   }
    // }

    if (!drawing || !canvasContext) return; // If the user is not actively drawing, exit the function.

    const { offsetX, offsetY } = e.nativeEvent;

    if (tool === "pen") {
      canvasContext.strokeStyle = currentColor;
      canvasContext.lineWidth = lineWidth;
      canvasContext.lineTo(offsetX, offsetY); // Extend the path to the new cursor position.
      canvasContext.stroke(); // Render the line on the canvas.
      setCurrentPath([...currentPath, { x: offsetX, y: offsetY }]); // Update the current path state with the new point.
    }

    if (isSocketEnabled) {
      socket.current.emit("draw-data", {
        tool: "pen",
        x: offsetX,
        y: offsetY,
        color: currentColor,
        lineWidth: lineWidth,
      });
    }

    if (tool != "pen") {
      // Clear previous preview before drawing the new shape
      // canvasContext.clearRect(
      //   0,
      //   0,
      //   canvasRef.current.width,
      //   canvasRef.current.height
      // );
      reDrawPreviousData();

      let shapeData = {
        tool,
        startX: startPos.x,
        startY: startPos.y,
        endX: offsetX,
        endY: offsetY,
        color: currentColor,
        lineWidth,
      };

      if (tool === "rectangle") {
        canvasContext.strokeRect(
          startPos.x,
          startPos.y,
          offsetX - startPos.x,
          offsetY - startPos.y
        );
      } else if (tool === "circle") {
        const radius = Math.sqrt(
          (offsetX - startPos.x) ** 2 + (offsetY - startPos.y) ** 2
        );
        canvasContext.beginPath();
        canvasContext.arc(startPos.x, startPos.y, radius, 0, Math.PI * 2);
        canvasContext.stroke();
        shapeData.radius = radius;
      } else if (tool === "line") {
        canvasContext.beginPath();
        canvasContext.moveTo(startPos.x, startPos.y);
        canvasContext.lineTo(offsetX, offsetY);
        canvasContext.stroke();
      }

      if (isSocketEnabled) {
        socket.current.emit("draw-data", shapeData);
      }
    }
  };

  const endDrawing = (e) => {
    setDrawing(false);
    canvasContext?.closePath();
    // if (currentPath.length > 0) {
    //   setDrawingActions([
    //     ...drawingActions,
    //     { path: currentPath, color: currentColor, width: lineWidth },
    //   ]);
    //   setCurrentPath([]);
    // }
    if (tool != "pen" && startPos) {
      const { offsetX, offsetY } = e.nativeEvent;
      let shapeData = {
        tool,
        startX: startPos.x,
        startY: startPos.y,
        endX: offsetX,
        endY: offsetY,
        color: currentColor,
        lineWidth,
      };
      if (tool === "circle") {
        shapeData.radius = Math.sqrt(
          (offsetX - startPos.x) ** 2 + (offsetY - startPos.y) ** 2
        );
      }
      setDrawingActions([...drawingActions, shapeData]); // Save the shape
      setCurrentPath([]);
    }
  };

  const drawFromSocket = (data) => {
    // console.log(data);
    // console.log(data.x);
    // console.log(data.y);
    // canvasContext.strokeStyle = data.color;
    // canvasContext.lineWidth = data.lineWidth;

    canvasContext.strokeStyle = data.color;
    canvasContext.lineWidth = data.lineWidth;

    if (data.tool === "pen") {
      canvasContext.lineTo(data.x, data.y);
      canvasContext.stroke();
    } else if (data.tool === "rectangle") {
      canvasContext.strokeRect(
        data.startX,
        data.startY,
        data.endX - data.startX,
        data.endY - data.startY
      );
    } else if (data.tool === "circle") {
      canvasContext.beginPath();
      canvasContext.arc(data.startX, data.startY, data.radius, 0, Math.PI * 2);
      canvasContext.stroke();
    } else if (data.tool === "line") {
      canvasContext.beginPath();
      canvasContext.moveTo(data.startX, data.startY);
      canvasContext.lineTo(data.endX, data.endY);
      canvasContext.stroke();
    }
  };

  const changeColor = (color) => {
    setCurrentColor(color);
  };

  const changeWidth = (width) => {
    setLineWidth(width); // Update the state for UI
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

  const reDrawPreviousData = (ctx = canvasContext) => {
    if (!ctx) {
      console.error("Canvas context is undefined in reDrawPreviousData!");
      return;
    }

    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height); // Clear the canvas

    drawingActions.forEach((action) => {
      ctx.strokeStyle = action.color;
      ctx.lineWidth = action.lineWidth;

      if (action.tool === "pen") {
        ctx.beginPath();
        ctx.moveTo(action.path[0].x, action.path[0].y);
        action.path.forEach((point) => {
          ctx.lineTo(point.x, point.y);
        });
        ctx.stroke();
      } else if (action.tool === "rectangle") {
        action.startX;
        action.startY;
        action.endX - action.startX;
        action.endY - action.startY;
      } else if (action.tool === "circle") {
        ctx.beginPath();
        ctx.arc(action.startX, action.startY, action.radius, 0, Math.PI * 2);
        ctx.stroke();
      } else if (action.tool === "line") {
        ctx.beginPath();
        ctx.moveTo(action.startX, action.startY);
        ctx.lineTo(action.endX, action.endY);
        ctx.stroke();
      }
    });

    // drawingActions.forEach(({ path, style }) => {
    //   if (!path || !path.length) return; // Ensure the path exists
    //   ctx.beginPath();
    //   ctx.strokeStyle = style.color;
    //   ctx.lineWidth = style.lineWidth;
    //   ctx.moveTo(path[0].x, path[0].y);

    //   path.forEach((point) => {
    //     ctx.lineTo(point.x, point.y);
    //   });
    //   ctx.stroke();
    // });
  };

  return {
    canvasContext,
    currentColor,
    lineWidth,
    startDrawing,
    draw,
    endDrawing,
    drawFromSocket,
    changeColor,
    changeWidth,
    undoDrawing,
    clearDrawing,
    reDrawPreviousData,
  };
};

export default useCanvas;
