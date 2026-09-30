import { describe, expect, it } from "vitest";
import {
  WorkbookEngine,
  clearCellFormat,
  cloneCell,
  defaultPostil,
  fromLuckyFile,
  toLuckyFile,
} from "../src/index.js";

describe("comment / postil", () => {
  it("preserves ps through clone, clearFormat, and lucky roundtrip", () => {
    const eng = new WorkbookEngine();
    eng.newComment(0, 0);
    eng.updateCommentValue(0, 0, "hi");
    eng.showHideComment(0, 0);
    const cell = eng.workbook.getCell(0, 0)!;
    expect(cell.ps?.value).toBe("hi");
    expect(cell.ps?.isshow).toBe(true);

    const cloned = cloneCell(cell)!;
    expect(cloned.ps).toEqual(cell.ps);
    cloned.ps!.value = "changed";
    expect(cell.ps?.value).toBe("hi");

    const cleared = clearCellFormat(cell)!;
    expect(cleared.ps?.value).toBe("hi");
    expect(cleared.bg).toBeUndefined();

    const raw = toLuckyFile(eng.workbook.toSnapshots());
    const again = fromLuckyFile(raw);
    const ps = again[0]!.celldata.find((c) => c.r === 0 && c.c === 0)?.v.ps;
    expect(ps?.value).toBe("hi");
    expect(ps?.isshow).toBe(true);
  });

  it("new/edit/delete/toggle via engine APIs", () => {
    const eng = new WorkbookEngine();
    eng.execute({ type: "setSelection", selection: [{ row: [1, 1], column: [1, 1] }] });
    eng.newComment();
    expect(eng.getPostil(1, 1)).toMatchObject(defaultPostil(""));
    expect(eng.getActiveComment()).toEqual({ row: 1, col: 1 });

    eng.updateCommentValue(1, 1, "note");
    eng.updateCommentGeometry(1, 1, { left: 100, top: 20, width: 160, height: 90 });
    expect(eng.getPostil(1, 1)).toMatchObject({
      value: "note",
      left: 100,
      top: 20,
      width: 160,
      height: 90,
      isshow: false,
    });

    eng.showHideComment(1, 1);
    expect(eng.getPostil(1, 1)?.isshow).toBe(true);

    eng.showHideAllComments(false);
    expect(eng.getPostil(1, 1)?.isshow).toBe(false);

    eng.deleteComment(1, 1);
    expect(eng.getPostil(1, 1)).toBeNull();
    expect(eng.getActiveComment()).toBeNull();
  });

  it("loads Comment demo sheet ps fields", () => {
    const raw = [
      {
        name: "Comment",
        index: "5",
        order: 5,
        celldata: [
          {
            r: 2,
            c: 2,
            v: {
              v: "HoverShown",
              m: "HoverShown",
              ps: {
                left: null,
                top: null,
                width: null,
                height: null,
                value: "Hello world!",
                isshow: false,
              },
            },
          },
          {
            r: 7,
            c: 2,
            v: {
              v: "Size",
              m: "Size",
              ps: {
                left: null,
                top: null,
                width: null,
                height: null,
                value: "Hello,world!",
                isshow: true,
              },
            },
          },
        ],
      },
    ];
    const eng = new WorkbookEngine(raw);
    expect(eng.getPostil(2, 2)?.value).toBe("Hello world!");
    expect(eng.getPostil(2, 2)?.isshow).toBe(false);
    expect(eng.getPostil(7, 2)?.isshow).toBe(true);
    const layout = eng.getPostilLayout(7, 2);
    expect(layout.width).toBe(144);
    expect(layout.height).toBe(84);
    const shown = eng.listPostils().filter((p) => p.ps.isshow);
    expect(shown).toHaveLength(1);
    expect(shown[0]).toMatchObject({ row: 7, col: 2 });
  });

  it("undoes setPostil", () => {
    const eng = new WorkbookEngine();
    eng.newComment(0, 0);
    eng.updateCommentValue(0, 0, "a");
    eng.undo();
    expect(eng.getPostil(0, 0)?.value).toBe("");
    eng.undo();
    expect(eng.getPostil(0, 0)).toBeNull();
  });
});
