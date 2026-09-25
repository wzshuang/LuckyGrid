/** Luckysheet `menuButton.setLineDash` preview drawing (border size submenu). */
const BORDER_TYPE_BY_VALUE: Record<number, string> = {
  0: "none",
  1: "Thin",
  2: "Hair",
  3: "Dotted",
  4: "Dashed",
  5: "DashDot",
  6: "DashDotDot",
  7: "Double",
  8: "Medium",
  9: "MediumDashed",
  10: "MediumDashDot",
  11: "MediumDashDotDot",
  12: "SlantedDashDot",
  13: "Thick",
};

export const BORDER_MENU_LINE_CANVAS_W = 120;
export const BORDER_MENU_LINE_CANVAS_H = 10;
/** Main-menu「边框粗细」文字下预览（宽度接近四字标签，非整行） */
export const BORDER_MENU_SIZE_PREVIEW_W = 56;
export const BORDER_MENU_SIZE_PREVIEW_H = 10;

export function drawBorderMenuLinePreview(
  ctx: CanvasRenderingContext2D,
  styleValue: number,
  canvasW = BORDER_MENU_LINE_CANVAS_W,
  canvasH = BORDER_MENU_LINE_CANVAS_H,
): void {
  const type = BORDER_TYPE_BY_VALUE[styleValue] ?? "Thin";
  if (type === "none") {
    ctx.clearRect(0, 0, canvasW, canvasH);
    return;
  }

  const lineEnd = Math.min(100, canvasW - 1);
  const m_st = 0;
  const m_ed = Math.floor(canvasH / 2);
  const line_st = lineEnd;
  const line_ed = m_ed;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0.5, 0.5);
  ctx.clearRect(-1, -1, canvasW + 2, canvasH + 2);

  if (type === "Hair") {
    ctx.setLineDash([1, 2]);
  } else if (type.includes("DashDotDot")) {
    ctx.setLineDash([2, 2, 5, 2, 2]);
  } else if (type.includes("DashDot")) {
    ctx.setLineDash([2, 5, 2]);
  } else if (type.includes("Dotted")) {
    ctx.setLineDash([2]);
  } else if (type.includes("Dashed")) {
    ctx.setLineDash([3]);
  } else {
    ctx.setLineDash([]);
  }

  ctx.strokeStyle = "#000000";
  ctx.beginPath();
  if (type === "Double") {
    ctx.lineWidth = 1;
    ctx.moveTo(m_st, m_ed - 1);
    ctx.lineTo(line_st, line_ed - 1);
    ctx.moveTo(m_st, m_ed + 1);
    ctx.lineTo(line_st, line_ed + 1);
  } else if (type.includes("Medium")) {
    ctx.moveTo(m_st, m_ed - 0.5);
    ctx.lineTo(line_st, line_ed - 0.5);
    ctx.lineWidth = 2;
  } else if (type === "Thick") {
    ctx.moveTo(m_st, m_ed);
    ctx.lineTo(line_st, line_ed);
    ctx.lineWidth = 3;
  } else {
    ctx.moveTo(m_st, m_ed);
    ctx.lineTo(line_st, line_ed);
    ctx.lineWidth = 1;
  }

  ctx.stroke();
  ctx.restore();
}
