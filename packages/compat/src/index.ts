/**
 * Best-effort Luckysheet-compatible imperative API.
 * Does NOT implement the full 109-function surface — only create/destroy/getCellValue/setCellValue.
 */
import { createApp, h, type App } from "vue";
import { LuckyGrid } from "@luckygrid/vue";
import {
  WorkbookEngine,
  type LuckyGridRaw,
} from "@luckygrid/core";

type Instance = {
  app: App;
  engine: WorkbookEngine;
};

const registry = new WeakMap<HTMLElement, Instance>();
let lastContainer: HTMLElement | null = null;

export type CreateOptions = {
  container: string | HTMLElement;
  data?: LuckyGridRaw[];
  lang?: string;
  /** Called with collaborative ops (no WebSocket) */
  onOp?: (op: unknown) => void;
};

export function create(options: CreateOptions): void {
  const el =
    typeof options.container === "string"
      ? document.getElementById(options.container)
      : options.container;
  if (!el) throw new Error(`Container not found: ${options.container}`);

  destroy(el);

  const engine = new WorkbookEngine(options.data);
  if (options.onOp) {
    engine.on((e) => {
      if (e.type === "op") options.onOp?.(e.op);
    });
  }

  const app = createApp({
    render: () =>
      h(LuckyGrid, {
        engine,
        lang: options.lang ?? "zh",
      }),
  });

  app.mount(el);
  registry.set(el, { app, engine });
  lastContainer = el;
}

export function destroy(container?: string | HTMLElement): void {
  const el =
    container == null
      ? lastContainer
      : typeof container === "string"
        ? document.getElementById(container)
        : container;
  if (!el) return;
  const inst = registry.get(el);
  if (inst) {
    inst.app.unmount();
    inst.engine.destroy();
    registry.delete(el);
  }
  if (lastContainer === el) lastContainer = null;
}

function resolveEngine(container?: string | HTMLElement): WorkbookEngine {
  const el =
    container == null
      ? lastContainer
      : typeof container === "string"
        ? document.getElementById(container)
        : container;
  if (!el) throw new Error("No luckygrid instance");
  const inst = registry.get(el);
  if (!inst) throw new Error("Engine not ready");
  return inst.engine;
}

export function getCellValue(
  row: number,
  column: number,
  options: { type?: "v" | "m" | "f"; container?: string | HTMLElement } = {},
): unknown {
  const eng = resolveEngine(options.container);
  return eng.getCellValue(row, column, options.type ?? "v");
}

export function setCellValue(
  row: number,
  column: number,
  value: string | number | boolean | null,
  options: { container?: string | HTMLElement } = {},
): void {
  const eng = resolveEngine(options.container);
  eng.setCellValue(row, column, value);
}

const luckygrid = {
  create,
  destroy,
  getCellValue,
  setCellValue,
};

/** Legacy alias for Luckysheet-style global name */
export const luckysheet = luckygrid;

export default luckygrid;
