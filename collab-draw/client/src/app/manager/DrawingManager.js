class DrawingManager {
  constructor(
    canvasRef,
    setDrawing,
    setDrawingActions,
    setCurrentPath,
    setCurrentColor,
    setLineWidth
  ) {
    this.canvasRef = canvasRef;
    this.canvasContext = null;
    this.setDrawing = setDrawing;
    this.setDrawingActions = setDrawingActions;
    this.setCurrentPath = setCurrentPath;
    this.setCurrentColor = setCurrentColor;
    this.setLineWidth = setLineWidth;
  }

  setContext(ctx) {
    this.canvasContext = ctx;
  }

  startDrawing = (e) => {
    if (canvasContext) {
      canvasContext.beginPath(); // Creates new Path if context present
      canvasContext.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
      setDrawing(true);
    }
  };

  draw = (e) => {
    if (!drawing) return; // If the user is not actively drawing, exit the function.
    // If drawing then
    if (canvasContext) {
      canvasContext.strokeStyle = currentColor;
      canvasContext.lineWidth = lineWidth;
      canvasContext.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY); // Extend the path to the new cursor position.
      canvasContext.stroke(); // Render the line on the canvas.
      setCurrentPath([
        ...currentPath,
        { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY },
      ]); // Update the current path state with the new point.

      if (isSocketEnabled) {
        socket.current.emit("draw-data", {
          x: e.nativeEvent.offsetX,
          y: e.nativeEvent.offsetY,
          color: currentColor,
          lineWidth: lineWidth,
        });
      }
    }
  };

  endDrawing = (e) => {
    setDrawing(false);
    canvasContext?.closePath();
    if (currentPath.length > 0) {
      setDrawingActions([
        ...drawingActions,
        { path: currentPath, color: currentColor, width: lineWidth },
      ]);
      setCurrentPath([]);
    }
  };

  drawFromSocket = (data) => {
    // console.log(data);
    console.log(data.x);
    console.log(data.y);
    canvasContext.strokeStyle = data.color;
    canvasContext.lineWidth = data.lineWidth;
    canvasContext.lineTo(data.x, data.y);
    canvasContext.stroke();
  };

  changeColor = (color) => {
    setCurrentColor(color);
    // setCurrentStyle({ ...currentStyle, color });
  };

  changeWidth = (width) => {
    setLineWidth(width); // Update the state for UI
    // setCurrentStyle({ ...currentStyle, lineWidth: parseInt(width) });
  };

  undoDrawing = () => {
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

  clearDrawing = () => {
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

  reDrawPreviousData = (ctx) => {
    drawingActions.forEach(({ path, style }) => {
      ctx.beginPath();
      ctx.strokeStyle = style.color;
      ctx.lineWidth = style.lineWidth;
      ctx.moveTo(path[0].x, path[0].y);

      path.forEach((point) => {
        ctx.lineTo(point.x, point.y);
      });
      ctx.stroke();
    });
  };
}
