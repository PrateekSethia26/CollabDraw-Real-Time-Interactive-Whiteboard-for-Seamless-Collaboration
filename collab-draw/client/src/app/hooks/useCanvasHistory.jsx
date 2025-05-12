import { useCallback, useState } from "react";

export default function useCanvasHistory(fabricCanvas) {
  const [history, setHistory] = useState([]);

  const saveCanvasState = useCallback(
    (newState) => {
      if (fabricCanvas) {
        if (newState) {
          // If a specific state is provided, use it
          setHistory((prev) => [...prev, newState]);
        } else {
          // Otherwise capture current canvas state
          const currentState = JSON.stringify(fabricCanvas.toJSON(["id"]));
          setHistory((prev) => [...prev, currentState]);
        }
      }
    },
    [fabricCanvas]
  );

  return { history, saveCanvasState };
}
