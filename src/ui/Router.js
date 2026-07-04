import allPlays from "../plays/index.js";
import { FORMATIONS } from "../config.js";

const slugMap = new Map();
const reverseSlugMap = new Map();

allPlays.forEach((play, i) => {
  const slug = toSlug(play.name);
  slugMap.set(`play:${slug}`, { type: "play", index: i });
  reverseSlugMap.set(slug, { type: "play", index: i });
});

Object.keys(FORMATIONS).forEach((name) => {
  const slug = toSlug(name);
  slugMap.set(`action:${slug}`, { type: "formation", name });
  reverseSlugMap.set(slug, { type: "formation", name });
});

export function toSlug(str) {
  return str
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function resolveRoute(hash) {
  const h = hash.replace(/^#\/?/, "");
  if (!h) return { page: "home" };

  const parts = h.split("/");

  if (parts[0] === "play" && parts[1]) {
    return { page: "play", slug: parts[1] };
  }

  if (parts[0] === "editor") {
    if (parts[1] === "formation" && !parts[2]) {
      return { page: "editor-formation" };
    }
    if (parts[1] === "formation" && parts[2]) {
      return { page: "editor-formation-load", slug: parts[2] };
    }
    if (parts[1] === "action" && parts[2]) {
      return { page: "editor-action", slug: parts[2] };
    }
    if (parts[1] === "from-play" && parts[2]) {
      return { page: "editor-from-play", slug: parts[2] };
    }
  }

  return { page: "home" };
}

export function navigate(path) {
  location.hash = `#/${path}`;
}

export function initRouter(onRoute) {
  const handler = () => {
    const route = resolveRoute(location.hash);
    onRoute(route);
  };

  window.addEventListener("hashchange", handler);
  handler();

  return () => window.removeEventListener("hashchange", handler);
}

export function lookupSlug(type, slug) {
  const entry = slugMap.get(`${type}:${slug}`);
  if (entry) return entry;

  for (const [key, value] of slugMap) {
    if (key.startsWith(`${type}:`) && value.index != null) {
      return value;
    }
  }
  return null;
}

export function playSlug(index) {
  return toSlug(allPlays[index].name);
}

export function formationSlug(name) {
  return toSlug(name);
}