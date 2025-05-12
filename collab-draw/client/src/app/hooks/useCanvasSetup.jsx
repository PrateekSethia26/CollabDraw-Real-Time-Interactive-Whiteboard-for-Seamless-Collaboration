import { useEffect } from "react";
import toast from "react-hot-toast";

export default function useCanvasSetup({
  canvasRef,
  setFabricCanvas,
  setHistory,
  SELECTION_STYLES,
  activeTool,
}) {
  useEffect(() => {
    if (!canvasRef.current) {
      console.error("Canvas is not defined");
      return;
    }

    // Initialize canvas
    const canvas = new fabric.Canvas(canvasRef.current, {
      isDrawingMode: activeTool === "pen",
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: "#ffffff",
      // Set default selection styles
      selectionColor: SELECTION_STYLES.SELECTION_COLOR,
      selectionBorderColor: SELECTION_STYLES.SELECTION_BORDER_COLOR,
      selectionLineWidth: 1,
    });

    setFabricCanvas(canvas);

    const windowResize = () => {
      canvas.setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
      canvas.renderAll();
    };
    window.addEventListener("resize", windowResize);

    setTimeout(() => {
      const initialState = JSON.stringify(canvas.toJSON(["id"]));
      setHistory([initialState]);
    }, 100);

    toast.success("Canvas ready! Start drawing!");

    return () => {
      canvas.dispose();
      window.removeEventListener("resize", windowResize);
    };
  }, []);
}
