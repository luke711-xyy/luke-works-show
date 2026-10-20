import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CaseStory } from "./App";
import { mediaFor, projects } from "./data/projects";

describe("editorial case-study composition", () => {
  it.each(projects)(
    "retains every original paragraph and image in viewer order for $title",
    (project) => {
      const media = mediaFor(project.id);
      const html = renderToStaticMarkup(
        createElement(CaseStory, { project, open: () => {} }),
      );
      for (const text of [
        ...project.introduction,
        ...project.decisions.flatMap((decision) => [
          decision.title,
          decision.text,
        ]),
        ...media.map((item) => item.caption),
      ]) {
        // Captions occur in the image's accessible name, alt text, and figure;
        // all original narrative text must occur exactly once.
        if (!media.some((item) => item.caption === text)) {
          expect(html.split(text).length - 1).toBe(1);
        } else {
          expect(html).toContain(text);
        }
      }
      expect([...html.matchAll(/<figure\b/g)].length).toBe(media.length);
      expect(
        [...html.matchAll(/<img[^>]+src="([^"]+)"/g)].map((m) => m[1]),
      ).toEqual(
        media.filter((item) => item.kind === "image").map((item) => item.clear),
      );
      const images = media.filter((item) => item.kind === "image");
      for (let i = 0; i < images.length; i++) {
        expect(html).toContain(
          `aria-label="图片 ${i + 1}，共 ${images.length} 张"`,
        );
      }
    },
  );
});
