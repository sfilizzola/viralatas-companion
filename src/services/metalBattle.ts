// src/services/metalBattle.ts

const METAL_BATTLE_COUNTRIES: Record<string, string> = {
  // ── Day 1 (Wednesday) — W.E.T. Stage ──────────────────────────
  WET1:  'HU',  // Hungary
  WET2:  'CY',  // Cyprus          — Speak in Whispers
  WET3:  'GR',  // Greece          — I See Red
  WET4:  'SE',  // Sweden          — Goodnight Greatness
  WET5:  'AT',  // Austria         — The Crescent's Call
  WET6:  'FR',  // France          — Ashed Winter
  WET7:  'LU',  // Luxembourg      — Blanket Hill
  WET8:  'BE',  // Belgium
  WET9:  'MX',  // Mexico          — Elchivo
  WET10: 'LV',  // Latvia          — Morphide

  // ── Day 1 (Wednesday) — Headbangers Stage ─────────────────────
  HBA1:  'US',  // USA
  HBA2:  'CA',  // Canada          — BornBroken
  HBA3:  'ZA',  // South Africa      — Human Nebula
  HBA4:  'IE',  // Ireland
  HBA6:  'LT',  // Lithuania       — Sinamort
  HBA7:  'IT',  // Italy           — Deflag
  HBA8:  'FI',  // Finland
  HBA9:  'NO',  // Norway
  HBA10: 'IS',  // Iceland         — Sót

  // ── Day 2 (Thursday) — W.E.T. Stage ───────────────────────────
  WET13: 'HR',  // Croatia           — E.N.D.
  WET14: 'MT',  // Malta           — Haine
  WET15: 'BG',  // Bulgaria
  WET16: 'PH',  // Philippines
  WET17: 'JP',  // Japan           — Given By The Flames
  WET18: 'ES',  // Spain

  // ── Day 2 (Thursday) — Headbangers Stage ──────────────────────
  HBA13: 'NL',  // Netherlands     — Novelization
  HBA14: 'SK',  // Slovakia          — Gagor
  HBA15: 'CL',  // Chile           — Force
  HBA16: 'IN',  // India           — Midhaven
  HBA17: 'SV',  // El Salvador     — Gidora
  HBA18: 'CH',  // Switzerland
};

function isoToFlag(code: string): string {
  return [...code.toUpperCase()]
    .map(c => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join('');
}

/**
 * Returns the country flag emoji for a Metal Battle band by slot_id.
 * Returns null when the slot is absent from the map (e.g. WET23 award ceremony).
 */
export function getMetalBattleCountryFlag(slotId: string): string | null {
  const val = METAL_BATTLE_COUNTRIES[slotId];
  if (!val) return null;
  return isoToFlag(val);
}
