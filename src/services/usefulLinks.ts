import type { UsefulLink, UsefulLinksFile } from '../types';

type ParsedUsefulLinks = {
  links: UsefulLink[];
  linksByFestival: Record<string, UsefulLink[]>;
};

let cachedFile: ParsedUsefulLinks | null = null;
let pendingLoad: Promise<ParsedUsefulLinks> | null = null;

function isUsefulLink(value: unknown): value is UsefulLink {
  if (!value || typeof value !== 'object') return false;
  const link = value as Partial<UsefulLink>;
  return (
    typeof link.title === 'string' &&
    link.title.trim().length > 0 &&
    typeof link.url === 'string' &&
    link.url.trim().length > 0 &&
    (link.icon === undefined || typeof link.icon === 'string')
  );
}

function parseLinkList(value: unknown): UsefulLink[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isUsefulLink);
}

function parseUsefulLinksFile(value: unknown): ParsedUsefulLinks {
  if (!value || typeof value !== 'object') {
    return { links: [], linksByFestival: {} };
  }
  const file = value as Partial<UsefulLinksFile> & {
    linksByFestival?: Record<string, unknown>;
  };

  const linksByFestival: Record<string, UsefulLink[]> = {};
  if (file.linksByFestival && typeof file.linksByFestival === 'object') {
    for (const [slug, list] of Object.entries(file.linksByFestival)) {
      const parsed = parseLinkList(list);
      if (parsed.length > 0) linksByFestival[slug] = parsed;
    }
  }

  return {
    links: parseLinkList(file.links),
    linksByFestival,
  };
}

async function loadUsefulLinksFile(): Promise<ParsedUsefulLinks> {
  if (cachedFile) return cachedFile;
  if (pendingLoad) return pendingLoad;

  pendingLoad = fetch('/useful-links.json')
    .then(async (response) => {
      if (!response.ok) return { links: [], linksByFestival: {} };
      const json = await response.json();
      const parsed = parseUsefulLinksFile(json);
      cachedFile = parsed;
      return parsed;
    })
    .catch(() => ({ links: [], linksByFestival: {} }))
    .finally(() => {
      pendingLoad = null;
    });

  return pendingLoad;
}

/** Active Festival slug selects `linksByFestival[slug]`; falls back to top-level `links`. */
export async function loadUsefulLinks(festivalSlug?: string | null): Promise<UsefulLink[]> {
  const file = await loadUsefulLinksFile();
  if (festivalSlug && file.linksByFestival[festivalSlug]?.length) {
    return file.linksByFestival[festivalSlug];
  }
  return file.links;
}

/** Test helper — clears module cache between cases. */
export function resetUsefulLinksCacheForTests(): void {
  cachedFile = null;
  pendingLoad = null;
}
