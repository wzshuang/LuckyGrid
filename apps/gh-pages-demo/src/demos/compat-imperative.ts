import type { DemoDefinition } from "../types";

export const compatImperative: DemoDefinition = {
  id: "compat-imperative",
  title: "luckygrid.create",
  description: "命令式挂载（与 luckysheet.* 别名相同）。",
  kind: "compat",
  initialCode: `return {
  kind: "compat",
  containerId: "compat-host",
  data: [
    {
      name: "Compat",
      celldata: [
        { r: 0, c: 0, v: { v: 42, m: "42" } },
        { r: 1, c: 0, v: { v: "compat", m: "compat" } },
      ],
    },
  ],
};`,
};
