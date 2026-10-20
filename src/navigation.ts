import { projectIds, type ProjectId } from "./data/projects";
export type NavigationState = {
  page: "pond" | "works";
  selected: ProjectId;
  detail: ProjectId | null;
};
export function isProjectId(
  value: string | null | undefined,
): value is ProjectId {
  return projectIds.includes(value as ProjectId);
}
export function parseLocation(path: string, search: string): NavigationState {
  let detail = "";
  try {
    detail = decodeURIComponent(path.split("/")[2] ?? "");
  } catch {}
  const focus = new URLSearchParams(search).get("focus");
  const selected = isProjectId(detail)
    ? detail
    : isProjectId(focus)
      ? focus
      : "mosic";
  return {
    page: path.startsWith("/works") ? "works" : "pond",
    selected,
    detail: path.startsWith("/works/") && isProjectId(detail) ? detail : null,
  };
}
export function navigationUrl(state: NavigationState) {
  return state.page === "pond"
    ? "/"
    : state.detail
      ? `/works/${state.detail}`
      : `/works?focus=${state.selected}`;
}

export function writeHistorySafely(
  browser: Pick<History, "pushState" | "replaceState">,
  state: unknown,
  url: string,
  replace = false,
) {
  try {
    browser[replace ? "replaceState" : "pushState"](state, "", url);
    return true;
  } catch {
    // History may be rate-limited (notably WebKit), unavailable or sandboxed.
    // URL persistence is optional; it must never block the visible interface.
    return false;
  }
}

export function commitNavigation(
  browser: Pick<History, "pushState" | "replaceState">,
  next: NavigationState,
  scroll: number,
  replace: boolean,
  commit: () => void,
) {
  commit();
  return writeHistorySafely(
    browser,
    {
      folio: true,
      scroll,
      selected: next.selected,
      detailEntry: Boolean(next.detail) && !replace,
    },
    navigationUrl(next),
    replace,
  );
}
