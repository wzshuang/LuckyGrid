export type TextWrapMode = 0 | 1 | 2;
export type TextRotateMode = 0 | 1 | 2 | 3 | 4 | 5;

export type MeasureTextFn = (text: string, font: string) => { width: number; height: number };

export type TextGlyph = {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type CellTextLayout = {
  glyphs: TextGlyph[];
  contentWidth: number;
  contentHeight: number;
  angleDeg: number;
  /** true when cross-cell overflow drawing is allowed */
  overflow: boolean;
};
