# Live Page Cluster + Bottom Sheet — Design Spec

**Date:** 2026-05-16  
**Branch:** `exp/cluster`  
**Status:** Approved

---

## 1. Overview

Replace the always-visible member pill list on every `groupCard` in `RightNowPage` with a **collapsed avatar cluster**. Tapping any card opens a **themed bottom sheet** showing members split into "Here now" and "Heading next" sections.

Scope: all 4 card types — `band`, `metal_place`, `camping`, `lost`.

---

## 2. User-facing behaviour

| State | What the user sees |
|---|---|
| Default (collapsed) | Each group card shows stacked avatar circles (max 5) + overflow count + going/there/resting label. No names visible. |
| Tap card | Backdrop fades in. Bottom sheet slides up from the bottom. |
| Sheet open | Atmospheric header in the card's colour. Members split into "Here now" (pulsing dot) and "Heading next" (stage-coloured pill). Drag handle visible. |
| Tap backdrop or swipe down | Sheet dismisses. Card returns to collapsed state. |

Only one sheet can be open at a time. Opening a second card closes the first (state is a single `activeGroup` value, not a stack).

---

## 3. Architecture

### 3.1 State location

`activeGroup: CrewLiveGroup | null` lives in **`RightNowPage`**, co-located with existing `crewGroups`, `crewPlans`, and `userId` — the same pattern as `BandDetailModal` on `PopularPage`.

```
RightNowPage
  ├── activeGroup state
  ├── CrewGroupsSection  ← receives onGroupSelect
  │     └── groupCard articles (now tappable, collapsed)
  └── LiveCardSheet      ← rendered at page root when activeGroup != null
```

### 3.2 Props flow

**`CrewGroupsSection`** gets one new prop:

```ts
onGroupSelect: (group: CrewLiveGroup) => void
```

**`LiveCardSheet`** (new component):

```ts
type LiveCardSheetProps = {
  group: CrewLiveGroup;
  crewPlans: CrewLivePlan[];
  userId: string | null;
  metalPlaceConfig: MetalPlaceConfig | null;
  onClose: () => void;
  t: TFunction;
};
```

No new data fetching. `crewPlans` is already available in `useNowData()`.

---

## 4. Card changes — `CrewGroupsSection`

### 4.1 Remove member pill list from cards

The `<ul className={styles.memberList}>` and `<CrewMember>` pills are **removed** from the `groupCard` article body. Cards become visually compact.

### 4.2 Add `ClusterRow` sub-component

A new local component `ClusterRow` renders inside each `groupCard`, replacing the pill list:

```tsx
function ClusterRow({ members, kind }: { members: CrewLivePlan[]; kind: string }) {
  const visible = members.slice(0, 5);
  const overflow = members.length - visible.length;
  return (
    <div className={styles.clusterRow}>
      <div className={styles.clusterAvatars}>
        {visible.map(m => (
          <Avatar key={m.id} size={26} src={m.avatar_url} initial={m.label.charAt(0).toUpperCase()} className={styles.clusterAvatar} />
        ))}
        {overflow > 0 && <span className={styles.clusterOverflow}>+{overflow}</span>}
      </div>
      <span className={styles.clusterCount}>{members.length} <CountLabel kind={kind} /></span>
    </div>
  );
}
```

Count label text by card type:

| kind | label key |
|---|---|
| `band` | existing `goingLabel` |
| `metal_place` | new `metalPlaceCountLabel` ("here") |
| `camping` | new `campingCountLabel` ("resting") |
| `lost` | new `lostCountLabel` ("wandering") |

### 4.3 Cards become tappable

```tsx
<article
  className={...}
  onClick={() => onGroupSelect(group)}
  style={{ cursor: 'pointer' }}
>
```

---

## 5. New component — `LiveCardSheet`

**File:** `src/components/now/LiveCardSheet.tsx`  
**CSS module:** `src/components/now/LiveCardSheet.module.css`

### 5.1 Structure

```
<fixed backdrop (onClick=onClose)>
<fixed sheet (bottom: 0, slide-up animation)>
  <drag handle>
  <atmospheric header>
    <stage dot + stage name + time>    ← band cards only
    <title>                            ← band name or card type label
    <count>
  </atmospheric header>
  <member list>
    <section "Here now">
      <MemberRow> with pulsing live dot
    </section>
    [divider if both sections non-empty]
    <section "Heading next">
      <MemberRow> with next-band pill (stage-coloured dot + band name)
    </section>
  </member list>
</sheet>
```

### 5.2 Colour helper

```ts
function groupAccentColor(group: CrewLiveGroup): string {
  if (group.kind === 'band') return stageColor(group.band.stage);
  if (group.kind === 'metal_place') return 'rgba(217, 119, 6, 1)';
  if (group.kind === 'camping') return 'var(--signal-ok)';
  return 'var(--signal-lost)'; // lost
}
```

The `groupAccentColor` value drives: header gradient, top border, handle colour, section dot colours, avatar border colour.

### 5.3 Member classification

All `group.members` are present at this location by definition — `CrewGroupsSection` only puts a member in a group if that is their current plan. The split is therefore based on whether they have a next band:

- **"Here now"** — members where `crew.plan.nextBand === null`. Rendered with a pulsing live dot, no extra label.
- **"Heading next"** — members where `crew.plan.nextBand !== null`. Rendered with the next-band pill.

If all members have a next band, the "Here now" section is omitted (no empty section label rendered). If no member has a next band, the "Heading next" section is omitted. The divider between sections only renders when both are non-empty.

### 5.4 Next-band pill

```tsx
<div className={styles.nextPill}>
  <div className={styles.nextStageDot} style={{ background: stageColor(plan.nextBand.stage) }} />
  <span className={styles.nextBandName}>{plan.nextBand.name}</span>
  <span className={styles.nextArrow}>›</span>
</div>
```

### 5.5 Animation

Sheet entrance: `transform: translateY(100%)` → `translateY(0)` over 280ms `cubic-bezier(0.32, 0.72, 0, 1)` (iOS-like spring feel).  
Backdrop entrance: `opacity: 0` → `0.5` over 200ms.  
Dismissal: reverse, 200ms.

Use CSS `@keyframes` triggered by a class toggle, or a simple inline transition — no external animation library needed.

---

## 6. CSS additions

### `CrewGroupsSection.module.css` — new rules

```css
.clusterRow { display: flex; align-items: center; gap: 8px; margin-top: 6px; }
.clusterAvatars { display: flex; }
.clusterAvatar { margin-left: -8px; border: 2px solid var(--bg-surface); }
.clusterAvatar:first-child { margin-left: 0; }
.clusterOverflow { font-size: 11px; color: var(--text-muted); margin-left: 4px; }
.clusterCount { font-size: 12px; color: var(--text-muted); }
```

### `LiveCardSheet.module.css` — new file

Key rules:

```css
.backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.5); z-index: 200; }
.sheet { position: fixed; bottom: 0; left: 0; right: 0; z-index: 201; border-radius: 16px 16px 0 0; max-height: 70vh; overflow-y: auto; }
.header { padding: 14px 16px 12px; border-bottom: 1px solid rgba(255,255,255,.08); }
.handle { width: 32px; height: 3px; border-radius: 2px; margin: 0 auto 12px; }
.stageRow { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
.stageDot { width: 8px; height: 8px; border-radius: 50%; }
.title { font-size: 17px; font-weight: 800; letter-spacing: -.02em; }
.count { font-size: 11px; margin-top: 3px; }
.memberList { padding: 12px 16px 20px; }
.sectionLabel { font-size: 9px; text-transform: uppercase; letter-spacing: .1em; opacity: .35; margin-bottom: 6px; }
.memberRow { display: flex; align-items: center; gap: 10px; padding: 5px 0; }
.liveDot { width: 7px; height: 7px; border-radius: 50%; animation: livePulse 2s infinite; }
@keyframes livePulse { 0%,100% { box-shadow: 0 0 0 0 currentColor; } 50% { box-shadow: 0 0 0 4px transparent; } }
.nextPill { display: flex; align-items: center; gap: 4px; background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.09); border-radius: 20px; padding: 2px 7px 2px 5px; }
.nextStageDot { width: 5px; height: 5px; border-radius: 50%; }
.nextBandName { font-size: 10px; opacity: .55; white-space: nowrap; }
.divider { height: 1px; background: rgba(255,255,255,.06); margin: 8px 0; }
```

---

## 7. i18n keys needed

New keys in all locale files (`RightNowPage_br.json`, `_en.json`, `_es.json`, `_de.json`):

| Key | Example (en) |
|---|---|
| `metalPlaceCountLabel` | `"here"` |
| `campingCountLabel` | `"resting"` |
| `lostCountLabel` | `"wandering"` |
| `hereNowSection` | `"Here now"` |
| `headingNextSection` | `"Heading next"` |
| `noUpcomingPicks` | `"no upcoming picks"` |

---

## 8. Files affected

| File | Change |
|---|---|
| `src/pages/RightNowPage.tsx` | Add `activeGroup` state; pass `onGroupSelect` to `CrewGroupsSection`; render `LiveCardSheet` |
| `src/components/now/CrewGroupsSection.tsx` | Add `onGroupSelect` prop; replace `memberList` with `ClusterRow`; make cards tappable |
| `src/components/now/CrewGroupsSection.module.css` | Add cluster styles |
| `src/components/now/LiveCardSheet.tsx` | **New file** |
| `src/components/now/LiveCardSheet.module.css` | **New file** |
| `src/i18n/RightNowPage_*.json` (×4) | Add 6 new keys |
| `.gitignore` | Add `.superpowers/` |

---

## 9. Out of scope

- Swipe-to-dismiss gesture (drag handle is visual only for now; tap backdrop to close)
- Haptic feedback
- Any changes to `/popular`, `/schedule`, or `/my-picks`
- Server-side changes — no new DB queries, no migrations

---

## 10. Open questions

- None. All design decisions resolved during brainstorm session.
