import { v4 as uuidv4 } from "uuid";
import { SELECTION_STYLES } from "../constants/canvasStyles";

// Assign unique ID to canvas objects
export const assignId = (obj) => {
  if (obj && !obj.id) {
    obj.id = uuidv4();
  }
  return obj;
};

// Apply consistent selection styles to objects
export const applySelectionStyles = (obj) => {
  if (!obj) return;

  if (obj.type === "activeSelection") {
    obj.set({
      borderColor: SELECTION_STYLES.SELECTION_BORDER_COLOR,
      cornerColor: SELECTION_STYLES.SELECTION_CORNER_COLOR,
      cornerSize: 10,
      transparentCorners: false,
      cornerStyle: "circle",
      borderDashArray: [3, 3],
    });
  } else {
    obj.set({
      borderColor: SELECTION_STYLES.SELECTION_BORDER_COLOR,
      cornerColor: SELECTION_STYLES.SELECTION_CORNER_COLOR,
      cornerSize: 8,
      transparentCorners: false,
      cornerStyle: "circle",
      borderDashArray: [3, 3],
    });
  }
};
