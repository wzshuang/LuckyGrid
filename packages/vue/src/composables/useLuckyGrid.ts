import { inject, type InjectionKey, type ShallowRef } from "vue";
import type { WorkbookEngine } from "@luckygrid/core";

export const LUCKY_ENGINE_KEY: InjectionKey<ShallowRef<WorkbookEngine | null>> =
  Symbol("luckygrid-engine");

export function useLuckyGrid(): WorkbookEngine {
  const engineRef = inject(LUCKY_ENGINE_KEY);
  if (!engineRef?.value) {
    throw new Error("useLuckyGrid() must be used inside <LuckyGrid>");
  }
  return engineRef.value;
}

export function useLuckyGridOptional(): WorkbookEngine | null {
  return inject(LUCKY_ENGINE_KEY)?.value ?? null;
}
