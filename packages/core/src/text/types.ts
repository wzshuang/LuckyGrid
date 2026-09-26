export type TextWrapMode = 0 | 1 | 2;
export type TextRotateMode = 0 | 1 | 2 | 3 | 4 | 5;

export type MeasureTextFn = (
  text: string,
  font: string,
) => { width: number; height: number; ascent?: number; descent?: number };

export type TextGlyph = {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /**
   * `top` — y is the em-box top (plain cells).
   * `alphabetic` — y is the shared baseline (inlineStr), matching Luckysheet fillText.
   */
  textBaseline?: "top" | "alphabetic";
  /** Set for inlineStr runs; plain glyphs keep the cell font. */
  font?: string;
  color?: string;
  fs?: number;
  cl?: number;
  un?: number;
};

export type CellTextLayout = {
  glyphs: TextGlyph[];
  contentWidth: number;
  contentHeight: number;
  angleDeg: number;
  /** true when cross-cell overflow drawing is allowed */
  overflow: boolean;
  /** rotation pivot in cell-local coords (Lucky textLeftAll / textTopAll) */
  pivotX: number;
  pivotY: number;
  /**
   * `cell` — glyph x/y are cell-local (no rotate).
   * `pivot` — glyph x/y are relative to pivot in the pre-rotate text frame
   *           (paint: translate(pivot) → rotate(-angle) → fillText at glyph).
   */
  glyphSpace: "cell" | "pivot";
};
