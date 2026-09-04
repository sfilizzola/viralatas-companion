import { normalizeBandName } from './timedBand';

type AnnouncedBand = {
  id: string;
  name: string;
};

type OfficialBand = {
  slot_id: string;
  name: string;
};

type NameMatchPlan = {
  updates: Array<{ dbId: string; slot_id: string }>;
  inserts: Array<{ slot_id: string }>;
  leftovers: Array<{ dbId: string }>;
  skippedClusters: Array<{
    nameKey: string;
    announcedDbIds: string[];
    officialSlotIds: string[];
  }>;
};

export function planNameMatches({
  announced,
  official,
}: {
  announced: AnnouncedBand[];
  official: OfficialBand[];
}): NameMatchPlan {
  const announcedByName = new Map<string, AnnouncedBand[]>();
  const officialByName = new Map<string, OfficialBand[]>();

  for (const row of announced) {
    const key = normalizeBandName(row.name);
    announcedByName.set(key, [...(announcedByName.get(key) ?? []), row]);
  }
  for (const row of official) {
    const key = normalizeBandName(row.name);
    officialByName.set(key, [...(officialByName.get(key) ?? []), row]);
  }

  const updates: NameMatchPlan['updates'] = [];
  const inserts: NameMatchPlan['inserts'] = [];
  const leftovers: NameMatchPlan['leftovers'] = [];
  const skippedClusters: NameMatchPlan['skippedClusters'] = [];
  const nameKeys = new Set([
    ...announcedByName.keys(),
    ...officialByName.keys(),
  ]);

  for (const nameKey of nameKeys) {
    const announcedRows = announcedByName.get(nameKey) ?? [];
    const officialRows = officialByName.get(nameKey) ?? [];

    if (announcedRows.length === 1 && officialRows.length === 1) {
      updates.push({
        dbId: announcedRows[0].id,
        slot_id: officialRows[0].slot_id,
      });
    } else if (announcedRows.length === 0) {
      inserts.push(...officialRows.map((row) => ({ slot_id: row.slot_id })));
    } else if (officialRows.length === 0) {
      leftovers.push(...announcedRows.map((row) => ({ dbId: row.id })));
    } else {
      skippedClusters.push({
        nameKey,
        announcedDbIds: announcedRows.map((row) => row.id),
        officialSlotIds: officialRows.map((row) => row.slot_id),
      });
    }
  }

  return { updates, inserts, leftovers, skippedClusters };
}
