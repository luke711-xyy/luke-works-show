import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App";

afterEach(() => vi.unstubAllGlobals());

describe("initial pond loading status", () => {
  it("presents the supplied poem as three readable lines before scene startup", () => {
    vi.stubGlobal("location", { pathname: "/", search: "" });
    vi.stubGlobal("history", { state: null });
    vi.stubGlobal("innerWidth", 390);
    vi.stubGlobal("innerHeight", 844);
    const html = renderToStaticMarkup(createElement(App));
    const lines = [
      ...html.matchAll(/<p class="loading-line[^\"]*">([^<]+)<\/p>/g),
    ].map((match) => match[1]);
    expect(lines).toEqual([
      "秋荷一滴露，清夜坠玄天。",
      "摇晃光不定，联翩影才圆。",
      "——刘禹锡《观荷叶露珠》",
    ]);
    const status = html.slice(html.indexOf('role="status"'));
    expect(status.indexOf("<svg")).toBeLessThan(status.indexOf("秋荷一滴露"));
    expect(html).not.toContain("正在铺开这一池作品");
  });
});
