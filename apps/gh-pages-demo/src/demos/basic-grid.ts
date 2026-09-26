import type { DemoDefinition } from "../types";

export const basicGrid: DemoDefinition = {
  id: "basic-grid",
  title: "空白网格",
  description: "最小 LuckyGrid，仅一个空 Sheet。",
  kind: "component",
  initialCode: `return {
  kind: "component",
  lang: "zh",
  data: [
    {
      name: "Sheet1",
      index: 0,
      status: 1,
      row: 30,
      column: 10,
      celldata: [],
    },
  ],
};`,
};
