// Canonical stage → CSS-variable mapping.
// Hex values live in `src/index.css` under :root (--stage-*).
// Update the token there, never re-pick a hex in component code.

export type StageToken =
  | '--stage-faster'
  | '--stage-harder'
  | '--stage-louder'
  | '--stage-wet'
  | '--stage-headbangers'
  | '--stage-wasteland'
  | '--stage-wackinger'
  | '--stage-jungle';

export const STAGE_COLOR_TOKENS: Record<string, StageToken> = {
  Faster: '--stage-faster',
  Harder: '--stage-harder',
  Louder: '--stage-louder',
  'W.E.T.': '--stage-wet',
  Headbangers: '--stage-headbangers',
  Wasteland: '--stage-wasteland',
  Wackinger: '--stage-wackinger',
  'Welcome to the Jungle': '--stage-jungle',
};

export function stageColorVar(stage: string): string {
  const token = STAGE_COLOR_TOKENS[stage];
  return token ? `var(${token})` : 'var(--accent)';
}

// Legacy export kept so existing callers don't change in Phase A1.
// Returns a `var(--stage-*)` string suitable for inline styles or CSS values.
export const STAGE_COLORS: Record<string, string> = Object.fromEntries(
  Object.entries(STAGE_COLOR_TOKENS).map(([stage, token]) => [stage, `var(${token})`]),
);

export function stageColor(stage: string): string {
  return stageColorVar(stage);
}
