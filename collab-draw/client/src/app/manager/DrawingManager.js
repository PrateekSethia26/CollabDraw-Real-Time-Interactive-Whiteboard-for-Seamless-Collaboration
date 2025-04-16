import { useState, useEffect } from "react";

const useCanvas = (canvasRef, socket, isSocketEnabled, tool) => {
  const [canvasContext, setCanvasContext] = useState(null); // for storing drawing context
  const [currentColor, setCurrentColor] = useState("black");
  const [lineWidth, setLineWidth] = useState(3);
  const [drawingActions, setDrawingActions] = useState([]); // Track our drawing history
  const [currentPath, setCurrentPath] = useState([]); // Path currently being drawn
  const [drawing, setDrawing] = useState(false);
  
  
  const [fabricCanvas, setFabricCanvas] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [activeObject, setActiveObject] = useState(null);
  const [startPoint, setStartPoint] = useState(null);

  // New state to store temporary shape when drawing
  const [tempShape, setTempShape] = useState(null);

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

      // Draw any existing actions when component initializes
      if (drawingActions.length > 0) {
        drawAllShapes(ctx);
      }
    } catch (error) {
      console.log(error.message);
    }
  }, []);

  const drawAllShapes = (ctx = canvasContext) => {
    if (!ctx) return;

    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    drawingActions.forEach((action) => {
      ctx.strokeStyle = action.color;
      ctx.lineWidth = action.lineWidth;

      if (action.tool === "pen") {
        ctx.beginPath();
        const points = action.path || [];
        if (points.length > 0) {
          ctx.moveTo(points[0].x, points[0].y);
          points.forEach((point, index) => {
            if (index > 0) {
              ctx.lineTo(point.x, point.y);
            }
          });
          ctx.stroke();
        }
      } else if (action.tool === "rectangle" || action.tool === "square") {
        const width = action.endX - action.startX;
        const height =
          action.tool === "square" ? width : action.endY - action.startY;
        ctx.strokeRect(action.startX, action.startY, width, height);
      } else if (action.tool === "line") {
        ctx.beginPath();
        ctx.moveTo(action.startX, action.startY);
        ctx.lineTo(action.endX, action.endY);
        ctx.stroke();
      } else if (action.tool === "circle") {
        const radius = action.radius;
        ctx.beginPath();
        ctx.arc(action.startX, action.startY, radius, 0, 2 * Math.PI);
        ctx.stroke();
      }
    });
  };

  const drawTempShape = (ctx = canvasContext, shape) => {
    if (!ctx || !shape) return;

    ctx.strokeStyle = shape.color;
    ctx.lineWidth = shape.lineWidth;

    if (shape.tool === "rectangle" || shape.tool === "square") {
      const width = shape.endX - shape.startX;
      const height =
        shape.tool === "square" ? width : shape.endY - shape.startY;
      ctx.strokeRect(shape.startX, shape.startY, width, height);
    } else if (shape.tool === "line") {
      ctx.beginPath();
      ctx.moveTo(shape.startX, shape.startY);
      ctx.lineTo(shape.endX, shape.endY);
      ctx.stroke();
    } else if (shape.tool === "circle") {
      const radius = shape.radius;
      ctx.beginPath();
      ctx.arc(shape.startX, shape.startY, radius, 0, 2 * Math.PI);
      ctx.stroke();
    }
  };

  const startDrawingFromParticularPoint = (e) => {
    console.log("Drawing has started");
    if (!canvasContext) return;
    setDrawing(true);
    const { offsetX, offsetY } = e.nativeEvent;

    if (tool === "pen") {
      canvasContext.beginPath(); // Creates new Path if context present
      canvasContext.moveTo(offsetX, offsetY);
    }

    setCurrentPath([{ x: offsetX, y: offsetY }]);

    if (isSocketEnabled) {
      socket.current.emit("start-drawing", {
        tool,
        x: offsetX,
        y: offsetY,
        color: currentColor,
        lineWidth,
      });
    }
  };

  const draw = (e) => {
    if (!drawing || !canvasContext) return; // If the user is not actively drawing, exit the function.

    const { offsetX, offsetY } = e.nativeEvent;
    const [start] = currentPath;

    if (tool === "pen") {
      canvasContext.strokeStyle = currentColor;
      canvasContext.lineWidth = lineWidth;
      canvasContext.lineTo(offsetX, offsetY); // Extend the path to the new cursor position.
      canvasContext.stroke(); // Render the line on the canvas.
      setCurrentPath([...currentPath, { x: offsetX, y: offsetY }]); // Update the current path state with the new point.
    } else {
      // canvasContext.clearRect(
      //   0,
      //   0,
      //   canvasRef.current.width,
      //   canvasRef.current.height
      // );
      // reDrawPreviousData();

      canvasContext.strokeStyle = currentColor;
      canvasContext.lineWidth = lineWidth;

      if (tool === "rectangle" || tool === "square") {
        const width = offsetX - start.x;
        const height = tool === "square" ? width : offsetY - start.y;
        canvasContext.strokeRect(start.x, start.y, width, height);
      }

      if (tool === "line") {
        canvasContext.beginPath();
        canvasContext.moveTo(start.x, start.y);
        canvasContext.lineTo(offsetX, offsetY);
        canvasContext.stroke();
      }

      if (tool === "circle") {
        const radius = Math.sqrt(
          Math.pow(offsetX - start.x, 2) + Math.pow(offsetY - start.y, 2)
        );
        canvasContext.beginPath();
        canvasContext.arc(start.x, start.y, radius, 0, 2 * Math.PI);
        canvasContext.stroke();
      }
    }

    if (isSocketEnabled) {
      socket.current.emit("draw-data", {
        tool,
        x: offsetX,
        y: offsetY,
        color: currentColor,
        lineWidth,
      });
    }
  };

  const drawFromSocket = (data) => {
    if (!canvasContext) {
      return;
    }

    if (!drawing) {
      setDrawing(true);
    }
    canvasContext.strokeStyle = data.color;
    canvasContext.lineWidth = data.lineWidth;
    if (data.tool === "pen") {
      canvasContext.lineTo(data.x, data.y);
      canvasContext.stroke();
      setCurrentPath([...currentPath, { x: data.x, y: data.y }]); // Update the current path state with the new point.
    }
  };

  const endDrawing = (e) => {
    if (!drawing) return;

    setDrawing(false);

    const { offsetX, offsetY } = e.nativeEvent;
    const [start] = currentPath;

    let action = null;

    if (tool != "pen") {
      action = {
        tool,
        color: currentColor,
        lineWidth,
        path: currentPath,
      };
    } else if (tool === "circle") {
      const radius = Math.sqrt(
        Math.pow(offsetX - start.x, 2) + Math.pow(offsetY - start.y, 2)
      );

      action = {
        tool,
        color: currentColor,
        lineWidth,
        startX: start.x,
        startY: start.y,
        radius,
      };
      // console.log(start);
    } else {
      action = {
        tool,
        color: currentColor,
        lineWidth,
        startX: start.x,
        startY: start.y,
        endX: offsetX,
        endY: offsetY,
      };
    }
    if (action) {
      setDrawingActions((prev) => [...prev, action]);
    }
    setCurrentPath([]);
  };
  const changeColor = (color) => {
    setCurrentColor(color);
  };

  const changeWidth = (width) => {
    setLineWidth(width); // Update the state for UI
  };

  const undoDrawing = () => {
    // if (drawingActions.length > 0) {
    //   drawingActions.pop();
    //   const newContext = canvasRef.current.getContext("2d");
    //   newContext.clearRect(
    //     0,
    //     0,
    //     canvasRef.current.width,
    //     canvasRef.current.height
    //   );

    //   drawingActions.forEach(({ path, style }) => {
    //     newContext.beginPath();
    //     newContext.strokeStyle = style.color;
    //     newContext.lineWidth = style.lineWidth;
    //     newContext.moveTo(path[0].x, path[0].y);
    //     path.forEach((point) => {
    //       newContext.lineTo(point.x, point.y);
    //     });
    //     newContext.stroke();
    //   });
    // }

    if (drawingActions.length > 0) {
      // Remove the last action
      setDrawingActions((prev) => prev.slice(0, -1));

      // Redraw the canvas with remaining actions
      drawAllShapes();
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

  // const reDrawPreviousData = (ctx = canvasContext) => {
  //   if (!ctx) {
  //     console.error("Canvas context is undefined in reDrawPreviousData!");
  //     return;
  //   }

  //   ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height); // Clear the canvas

  //   drawingActions.forEach((action) => {
  //     ctx.strokeStyle = action.color;
  //     ctx.lineWidth = action.lineWidth;

  //     if (action.tool === "pen") {
  //       ctx.beginPath();
  //       ctx.moveTo(action.path[0].x, action.path[0].y);
  //       action.path.forEach((point) => {
  //         ctx.lineTo(point.x, point.y);
  //       });
  //       ctx.stroke();
  //     } else if (action.tool === "rectangle") {
  //       action.startX;
  //       action.startY;
  //       action.endX - action.startX;
  //       action.endY - action.startY;
  //     } else if (action.tool === "circle") {
  //       ctx.beginPath();
  //       ctx.arc(action.startX, action.startY, action.radius, 0, Math.PI * 2);
  //       ctx.stroke();
  //     } else if (action.tool === "line") {
  //       ctx.beginPath();
  //       ctx.moveTo(action.startX, action.startY);
  //       ctx.lineTo(action.endX, action.endY);
  //       ctx.stroke();
  //     }
  //   });

  //   // drawingActions.forEach(({ path, style }) => {
  //   //   if (!path || !path.length) return; // Ensure the path exists
  //   //   ctx.beginPath();
  //   //   ctx.strokeStyle = style.color;
  //   //   ctx.lineWidth = style.lineWidth;
  //   //   ctx.moveTo(path[0].x, path[0].y);

  //   //   path.forEach((point) => {
  //   //     ctx.lineTo(point.x, point.y);
  //   //   });
  //   //   ctx.stroke();
  //   // });
  // };

  const reDrawPreviousData = () => {
    if (!canvasContext) return;

    console.log(drawingActions);
    drawingActions.forEach((action) => {
      canvasContext.strokeStyle = action.color;
      canvasContext.lineWidth = action.lineWidth;

      if (tool === "pen") {
        canvasContext.beginPath();
        action.path.forEach((point, index) => {
          if (index === 0) {
            canvasContext.moveTo(point.x, point.y);
          } else {
            canvasContext.lineTo(point.x, point.y);
          }
        });
        canvasContext.stroke();
      }

      if (tool === "line") {
        canvasContext.beginPath();
        canvasContext.moveTo(action.startX, action.startY);
        canvasContext.lineTo(action.endX, action.endY);
        canvasContext.stroke();
      }

      if (tool === "rectangle" || tool === "square") {
        // const width = action.endX - action.startX;
        // const height =
        //   action.tool === "square" ? width : action.endY - action.startY;
        // canvasContext.strokeRect(action.startX, action.startY, width, height);\
        canvasContext.beginPath();
        canvasContext.strokeRect(
          action.startX,
          action.startY,
          action.width,
          action.height
        );
      }
      if (tool === "circle") {
        canvasContext.beginPath();
        canvasContext.arc(
          action.startX,
          action.startY,
          action.radius,
          0,
          2 * Math.PI
        );
        canvasContext.stroke();
      }
    });
  };

  return {
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
    reDrawPreviousData,
    endDrawing,
  };
};

export default useCanvas;
