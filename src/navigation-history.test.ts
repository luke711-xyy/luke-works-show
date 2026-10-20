import { describe, expect, it } from "vitest";
import { commitNavigation } from "./navigation";

describe("navigation survives browser history failures", () => {
  it.each([false, true])(
    "commits the visible detail even if a history write fails (replace=%s)",
    (replace) => {
      let visible = "works";
      const browser = {
        pushState() {
          throw new DOMException("history rate exceeded", "SecurityError");
        },
        replaceState() {
          throw new DOMException("history rate exceeded", "SecurityError");
        },
      };
      const next = {
        page: "works" as const,
        selected: "moce-film" as const,
        detail: "moce-film" as const,
      };
      const result = commitNavigation(browser, next, 0, replace, () => {
        visible = "detail";
      });
      expect(visible).toBe("detail");
      expect(result).toBe(false);
    },
  );
  it("keeps a single successful detail entry with its scroll restoration state", () => {
    const entries: { state: unknown; url: unknown }[] = [];
    const browser = {
      pushState(state: unknown, _title: string, url?: string | URL | null) {
        entries.push({ state, url });
      },
      replaceState() {
        throw new Error("unexpected second write");
      },
    };
    expect(
      commitNavigation(
        browser,
        { page: "works", selected: "moce-film", detail: "moce-film" },
        1529,
        false,
        () => {},
      ),
    ).toBe(true);
    expect(entries).toEqual([
      {
        state: {
          folio: true,
          scroll: 1529,
          selected: "moce-film",
          detailEntry: true,
        },
        url: "/works/moce-film",
      },
    ]);
  });
});
