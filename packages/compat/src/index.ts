/**
 * Best-effort Luckysheet-compatible imperative API.
 * Does NOT implement the full 109-function surface — only create/destroy/getCellValue/setCellValue
 * plus workbook name helpers.
 */
import { createApp, h, shallowRef, type App, type ShallowRef } from "vue";
import { LuckyGrid, type InfoBarUserInfo } from "@luckygrid/vue";
import {
  WorkbookEngine,
  type LuckyGridRaw,
} from "@luckygrid/core";

type Instance = {
  app: App;
  engine: WorkbookEngine;
  title: ShallowRef<string>;
};

const registry = new WeakMap<HTMLElement, Instance>();
let lastContainer: HTMLElement | null = null;

export type CreateOptions = {
  container: string | HTMLElement;
  data?: LuckyGridRaw[];
  lang?: string;
  /** Called with collaborative ops (no WebSocket) */
  onOp?: (op: unknown) => void;
  /** Show top info bar (default true) */
  showinfobar?: boolean;
  /** Workbook title shown in the info bar */
  title?: string;
  /** Back-button navigation target */
  myFolderUrl?: string;
  userInfo?: InfoBarUserInfo;
  /** Raw HTML inserted into the info bar (Luckysheet-compatible) */
  functionButton?: string;
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

  const title = shallowRef(options.title ?? "Luckysheet Demo");

  const app = createApp({
    render: () =>
      h(LuckyGrid, {
        engine,
        lang: options.lang ?? "zh",
        showInfoBar: options.showinfobar ?? true,
        title: title.value,
        myFolderUrl: options.myFolderUrl,
        userInfo: options.userInfo ?? false,
        functionButton: options.functionButton ?? "",
        "onUpdate:title": (value: string) => {
          title.value = value;
        },
      }),
  });

  app.mount(el);
  registry.set(el, { app, engine, title });
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

function resolveEl(container?: string | HTMLElement): HTMLElement {
  const el =
    container == null
      ? lastContainer
      : typeof container === "string"
        ? document.getElementById(container)
        : container;
  if (!el) throw new Error("No luckygrid instance");
  return el;
}

function resolveInstance(container?: string | HTMLElement): Instance {
  const el = resolveEl(container);
  const inst = registry.get(el);
  if (!inst) throw new Error("Engine not ready");
  return inst;
}

function resolveEngine(container?: string | HTMLElement): WorkbookEngine {
  return resolveInstance(container).engine;
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

export function getWorkbookName(container?: string | HTMLElement): string {
  return resolveInstance(container).title.value;
}

export function setWorkbookName(
  name: string,
  container?: string | HTMLElement,
): void {
  resolveInstance(container).title.value = name;
}

const luckygrid = {
  create,
  destroy,
  getCellValue,
  setCellValue,
  getWorkbookName,
  setWorkbookName,
};

/** Legacy alias for Luckysheet-style global name */
export const luckysheet = luckygrid;

export default luckygrid;
