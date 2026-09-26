import type { DemoDefinition } from "../types";

export const sheetMini: DemoDefinition = {
  id: "sheet-mini",
  title: "迷你样例数据",
  description: "带合并单元格与少量格式的 celldata。",
  kind: "component",
  initialCode: `return {
  kind: "component",
  data: [
    {
      name: "CellMini",
      index: 0,
      order: 0,
      status: 1,
      row: 20,
      column: 10,
      config: {
        merge: { "2_1": { r: 2, c: 1, rs: 2, cs: 2 } },
        rowlen: { "0": 24 },
        columnlen: { "0": 100 },
      },
      celldata: [
        {
          r: 0,
          c: 0,
          v: {
            v: 1,
            m: "1",
            ct: { fa: "General", t: "n" },
            fs: 11,
            fc: "rgb(51, 51, 51)",
            ht: 1,
            vt: 1,
          },
        },
        {
          r: 0,
          c: 1,
          v: { v: "Hello", m: "Hello", ht: 1, vt: 1 },
        },
        {
          r: 1,
          c: 0,
          v: { v: "LuckyGrid", m: "LuckyGrid", bl: 1, fs: 14 },
        },
      ],
    },
  ],
};`,
};
