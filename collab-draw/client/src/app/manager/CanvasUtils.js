const initializeCanvas = (
  canvasRef,
  currentColor,
  lineWidth,
  setContext,
  reDrawPreviousData
) => {
  if (canvasRef.current) {
    // Checking canvasRef is available then set these properties to canvasRef
    const canvas = canvasRef.current;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext("2d");
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    setContext(ctx);
    reDrawPreviousData(ctx); // To redraw previous drawing actions
    console.log(ctx);
  }
};

export default initializeCanvas;
