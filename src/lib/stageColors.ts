export const STAGE_COLORS: Record<string, string> = {
  'W.E.T.': '#c0392b',
  Harder: '#e67e22',
  Louder: '#8e44ad',
  Faster: '#2980b9',
  Headbangers: '#16a085',
  Wasteland: '#2c3e50',
  Wackinger: '#95a5a6',
  'Welcome to the Jungle': '#f39c12',
};

export function stageColor(stage: string): string {
  return STAGE_COLORS[stage] ?? 'var(--accent)';
}
