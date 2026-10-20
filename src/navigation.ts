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
