import type { DemoDefinition } from "../types";
import { basicGrid } from "./basic-grid";
import { sheetMini } from "./sheet-mini";
import { compatImperative } from "./compat-imperative";
import { listenOp } from "./listen-op";

export const demoGroups: { title: string; demos: DemoDefinition[] }[] = [
  {
    title: "组件",
    demos: [basicGrid, sheetMini, listenOp],
  },
  {
    title: "Compat API",
    demos: [compatImperative],
  },
];

export const allDemos: DemoDefinition[] = demoGroups.flatMap((g) => g.demos);

export function demoById(id: string): DemoDefinition | undefined {
  return allDemos.find((d) => d.id === id);
}
