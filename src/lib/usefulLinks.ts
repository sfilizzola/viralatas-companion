import type { UsefulLink, UsefulLinksFile } from '../types';

let cachedLinks: UsefulLink[] | null = null;
let pendingLoad: Promise<UsefulLink[]> | null = null;

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

function parseUsefulLinks(value: unknown): UsefulLink[] {
  if (!value || typeof value !== 'object') return [];
  const file = value as Partial<UsefulLinksFile>;
  if (!Array.isArray(file.links)) return [];
  return file.links.filter(isUsefulLink);
}

export async function loadUsefulLinks(): Promise<UsefulLink[]> {
  if (cachedLinks) return cachedLinks;
  if (pendingLoad) return pendingLoad;

  pendingLoad = fetch('/useful-links.json')
    .then(async (response) => {
      if (!response.ok) return [];
      const json = await response.json();
      const links = parseUsefulLinks(json);
      cachedLinks = links;
      return links;
    })
    .catch(() => [])
    .finally(() => {
      pendingLoad = null;
    });

  return pendingLoad;
}
