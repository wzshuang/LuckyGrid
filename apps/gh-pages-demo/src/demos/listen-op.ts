import type { DemoDefinition } from "../types";

export const listenOp: DemoDefinition = {
  id: "listen-op",
  title: "监听 op 事件",
  description: "编辑单元格时在预览上方显示最近一次 op（JSON）。",
  kind: "component",
  initialCode: `return {
  kind: "component",
  data: [
    {
      name: "Ops",
      celldata: [
        { r: 0, c: 0, v: { v: "改我", m: "改我" } },
      ],
    },
  ],
  showOpLog: true,
};`,
};
