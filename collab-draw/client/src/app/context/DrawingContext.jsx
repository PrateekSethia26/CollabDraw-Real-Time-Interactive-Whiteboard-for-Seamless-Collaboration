import { createContext, useContext, useState } from "react";

export const DrawingTool = Object.freeze({
  SELECT: "select",
  PEN: "pen",
  ERASER: "eraser",
  LINE: "line",
  CIRCLE: "circle",
  RECTANGLE: "rectangle",
  TEXT: "text",
});

const DrawingContext = createContext();

export const DrawingProvider = ({ children }) => {
  const [activeTool, setActiveTool] = useState(DrawingTool.PEN);
  const [strokeColor, setStrokeColor] = useState("#000000");
  const [strokeWidth, setStrokeWidth] = useState(5);
  const [undo, setUndo] = useState(() => {});
  const [clearCanvas, setClearCanvas] = useState(() => {});

  return (
    <DrawingContext.Provider
      value={{
        activeTool,
        setActiveTool,
        strokeColor, // Make sure all needed values are included
        setStrokeColor,
        strokeWidth,
        setStrokeWidth,
        undo,
        setUndo,
        clearCanvas,
        setClearCanvas,
      }}
    >
      {children}
    </DrawingContext.Provider>
  );
};

export const useDrawing = () => {
  const context = useContext(DrawingContext);
  if (!context) {
    throw new Error("useDrawing function creating an issue");
  }
  return context;
};
