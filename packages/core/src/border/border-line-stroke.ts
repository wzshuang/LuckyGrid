/**
 * Stroke params aligned with Luckysheet `menuButton.setLineDash`
 * (style 1–13 → Thin…Thick).
 */
export type BorderLineStroke = {
  lineWidth: number;
  dash: number[];
  /** Double: draw two parallel 1px strokes */
  dual?: boolean;
  /** Medium*: Lucky shifts path by 0.5px on the cross-axis */
  mediumAlign?: boolean;
};

export function borderLineStroke(style: number): BorderLineStroke {
  switch (style) {
    case 2: // Hair
      return { lineWidth: 1, dash: [1, 2] };
    case 3: // Dotted
      return { lineWidth: 1, dash: [2] };
    case 4: // Dashed
      return { lineWidth: 1, dash: [3] };
    case 5: // DashDot
      return { lineWidth: 1, dash: [2, 5, 2] };
    case 6: // DashDotDot
      return { lineWidth: 1, dash: [2, 2, 5, 2, 2] };
    case 7: // Double
      return { lineWidth: 1, dash: [], dual: true };
    case 8: // Medium
      return { lineWidth: 2, dash: [], mediumAlign: true };
    case 9: // MediumDashed
      return { lineWidth: 2, dash: [3], mediumAlign: true };
    case 10: // MediumDashDot
      return { lineWidth: 2, dash: [2, 5, 2], mediumAlign: true };
    case 11: // MediumDashDotDot
      return { lineWidth: 2, dash: [2, 2, 5, 2, 2], mediumAlign: true };
    case 12: // SlantedDashDot → DashDot pattern
      return { lineWidth: 1, dash: [2, 5, 2] };
    case 13: // Thick
      return { lineWidth: 3, dash: [] };
    default: // Thin (1) and unknown
      return { lineWidth: 1, dash: [] };
  }
}
