export type DemoKind = "component" | "compat";

export type DemoRunResult =
  | {
      kind: "component";
      data: unknown;
      lang?: string;
      showOpLog?: boolean;
    }
  | {
      kind: "compat";
      /** Called with mount target element id (without #) */
      containerId: string;
      data: unknown;
    };

export type DemoDefinition = {
  id: string;
  title: string;
  description: string;
  kind: DemoKind;
  /** Editable user script; must return DemoRunResult shape (see demos/*.ts). */
  initialCode: string;
};

export type DemoError = {
  message: string;
};
