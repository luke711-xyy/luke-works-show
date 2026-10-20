import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MediaFigure } from "./App";
import { getProject, mediaFor, projects } from "./data/projects";

describe("per-image figure information", () => {
  it.each(projects)(
    "keeps individual media descriptions for $title",
    (project) => {
      const media = mediaFor(project.id);
      const captions = media.map((item) => item.caption);
      expect(
        captions.every(
          (caption) => typeof caption === "string" && caption.trim().length > 0,
        ),
      ).toBe(true);
      expect(new Set(captions).size).toBe(media.length);
    },
  );

  it("renders the selected image description and its display position", () => {
    const project = getProject("water-reminder");
    const item = {
      ...mediaFor(project.id)[0],
      caption: "杯具管理：选择当前杯具与添加杯具。",
    };
    const html = renderToStaticMarkup(
      createElement(MediaFigure, {
        item,
        project,
        position: 3,
        total: 6,
        open: () => {},
      }),
    );
    expect(html).toContain("杯具管理：选择当前杯具与添加杯具。");
    expect(html).toContain("03 / 06");
    expect(html).toContain('aria-label="图片 3，共 6 张"');
    expect(html).not.toContain("可查看清晰原图");
    expect(html).not.toContain("查看画面");
  });

  it("does not label a video as an image", () => {
    const project = getProject("moce-film");
    const item = { ...mediaFor(project.id)[0], caption: "完整产品动态演示。" };
    const html = renderToStaticMarkup(
      createElement(MediaFigure, {
        item,
        project,
        position: 1,
        total: 1,
        open: () => {},
      }),
    );
    expect(html).toContain("完整产品动态演示。");
    expect(html).toContain("<video");
    expect(html).not.toContain("图片 1");
  });
});
