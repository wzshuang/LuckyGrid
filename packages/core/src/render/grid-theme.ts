/** Visual tokens aligned with Luckysheet 2.x luckysheet-core.css / draw.js */
export const GRID_THEME = {
  cellGridLine: "#dfdfdf",
  headerBg: "#f3f3f2",
  headerCellBg: "#ffffff",
  headerBorder: "#dfdfdf",
  headerBorderBottom: "#bbbbbb",
  headerText: "#000000",
  headerSelectFill: "rgba(76, 76, 76, 0.1)",
  headerSelectAccent: "#0188fb",
  selectionBorder: "#0188fb",
  /** `#luckysheet-cell-selected-focus`: under the selection fill, focus cell only */
  selectionFocusFill: "rgba(0, 80, 208, 0.15)",
  selectionFillActive: "rgba(1, 136, 251, 0.15)",
  selectionFillInactive: "rgba(1, 136, 251, 0.08)",
  selectionBorderInactive: "rgba(1, 136, 251, 0.45)",
  fillHandleFill: "#0188fb",
  fillHandleBorder: "#ffffff",
  canvasBackground: "#ffffff",
  /**
   * Freeze divider — Luckysheet `.luckysheet-freezebar-*-drop-bar` / `-drop-title`
   * (2px; bar over grid, title over header).
   */
  freezeBar: "rgba(0, 0, 0, 0.45)",
  freezeBarTitle: "#bcbdbc",
  freezeBarSize: 2,
  /** Comment corner marker — Luckysheet draw.js `#FC6666` / 8px */
  commentMarker: "#FC6666",
  commentMarkerSize: 8,
} as const;
