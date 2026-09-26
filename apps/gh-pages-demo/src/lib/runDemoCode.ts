import type { DemoRunResult } from "../types";

export type RunDemoOk = { ok: true; result: DemoRunResult };
export type RunDemoFail = { ok: false; error: string };

/**
 * Executes user-edited demo code in a strict function scope.
 * Available bindings: Vue (ref, computed, reactive, watch), LuckyGridRaw helpers via return value only.
 */
export function runDemoCode(code: string): RunDemoOk | RunDemoFail {
  try {
    const fn = new Function(`
      "use strict";
      ${code}
    `) as () => DemoRunResult;
    const result = fn();
    if (!result || typeof result !== "object") {
      return { ok: false, error: "代码必须 return 一个配置对象" };
    }
    if (result.kind === "component") {
      if (!Array.isArray(result.data)) {
        return { ok: false, error: 'kind: "component" 时 data 必须是数组' };
      }
      return { ok: true, result };
    }
    if (result.kind === "compat") {
      if (typeof result.containerId !== "string" || !result.containerId) {
        return { ok: false, error: 'kind: "compat" 需要 containerId 字符串' };
      }
      return { ok: true, result };
    }
    return { ok: false, error: "return.kind 必须是 component 或 compat" };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message };
  }
}
