import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { fetchOfficialSlots } from '../../../src/lib/lineup-official-source.ts';
import { applyLineupPlan } from '../../../src/lib/lineup-remote-apply.ts';
import {
  buildLineupPlan,
  formatLineupPlanReport,
  hashLineupPlan,
  isPlanApplicable,
  isPlanEmpty,
  summarizePlan,
  type DbBandRow,
  type LineupPlanContext,
} from '../../../src/lib/lineup-remote-plan.ts';
import { corsHeaders, requireGodlike } from './auth.ts';

const PLAN_TOKEN_TTL_MS = 10 * 60 * 1000;

type PlanTokenPayload = {
  hash: string;
  exp: number;
};

type PreviewRequest = { action: 'preview' };
type ApplyRequest = {
  action: 'apply';
  planToken: string;
  confirmDeletes?: boolean;
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function encodePlanToken(hash: string): string {
  const payload: PlanTokenPayload = {
    hash,
    exp: Date.now() + PLAN_TOKEN_TTL_MS,
  };
  return btoa(JSON.stringify(payload));
}

function decodePlanToken(token: string): PlanTokenPayload | null {
  try {
    const parsed = JSON.parse(atob(token)) as PlanTokenPayload;
    if (!parsed?.hash || typeof parsed.exp !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

async function loadDbBands(serviceClient: ReturnType<typeof createClient>): Promise<DbBandRow[]> {
  const { data, error } = await serviceClient
    .from('bands')
    .select('id, slot_id, name, stage, start_time, end_time, genre, image_url, category');

  if (error) {
    throw new Error(`Failed to load bands: ${error.message}`);
  }

  const nullRows = (data ?? []).filter((row) => !row.slot_id);
  if (nullRows.length > 0) {
    throw new Error('Abort: bands with NULL slot_id — run slot_id backfill first');
  }

  return (data ?? []) as DbBandRow[];
}

async function buildPlanContext(
  serviceClient: ReturnType<typeof createClient>,
): Promise<LineupPlanContext> {
  const [{ data: picks, error: pickError }, { data: missed, error: missedError }] =
    await Promise.all([
      serviceClient.from('user_picks').select('user_id, band_id'),
      serviceClient.from('user_missed_bands').select('user_id, band_id'),
    ]);

  if (pickError) throw new Error(`Failed to load picks: ${pickError.message}`);
  if (missedError) throw new Error(`Failed to load missed bands: ${missedError.message}`);

  const pickCounts = new Map<string, number>();
  const missedCounts = new Map<string, number>();
  const pickUserIdsByBand = new Map<string, string[]>();
  const missedUserIdsByBand = new Map<string, string[]>();

  for (const row of picks ?? []) {
    const bandId = row.band_id as string;
    const userId = row.user_id as string;
    pickCounts.set(bandId, (pickCounts.get(bandId) ?? 0) + 1);
    const list = pickUserIdsByBand.get(bandId) ?? [];
    list.push(userId);
    pickUserIdsByBand.set(bandId, list);
  }

  for (const row of missed ?? []) {
    const bandId = row.band_id as string;
    const userId = row.user_id as string;
    missedCounts.set(bandId, (missedCounts.get(bandId) ?? 0) + 1);
    const list = missedUserIdsByBand.get(bandId) ?? [];
    list.push(userId);
    missedUserIdsByBand.set(bandId, list);
  }

  return {
    pickCounts,
    missedCounts,
    pickUserIdsByBand,
    missedUserIdsByBand,
  };
}

async function buildRemotePlan(serviceClient: ReturnType<typeof createClient>) {
  const [officialSlots, dbBands, ctx] = await Promise.all([
    fetchOfficialSlots(),
    loadDbBands(serviceClient),
    buildPlanContext(serviceClient),
  ]);
  const plan = buildLineupPlan(dbBands, officialSlots, ctx);
  const hash = await hashLineupPlan(plan);
  return { plan, hash, officialCount: officialSlots.size };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const serviceClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const auth = await requireGodlike(req, serviceClient);
  if (auth instanceof Response) return auth;

  let body: PreviewRequest | ApplyRequest;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  if (body.action === 'preview') {
    try {
      const fetchedAt = new Date().toISOString();
      const { plan, hash, officialCount } = await buildRemotePlan(serviceClient);
      const summary = summarizePlan(plan);
      const planToken = encodePlanToken(hash);

      return jsonResponse({
        ok: true,
        fetchedAt,
        officialCount,
        planToken,
        planTokenExpiresAt: new Date(Date.now() + PLAN_TOKEN_TTL_MS).toISOString(),
        summary,
        report: formatLineupPlanReport(plan),
        plan,
        inSync: isPlanEmpty(plan),
        applicable: isPlanApplicable(plan),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Preview failed';
      return jsonResponse({ ok: false, error: message }, 500);
    }
  }

  if (body.action === 'apply') {
    const { planToken, confirmDeletes = false } = body;
    if (!planToken) {
      return jsonResponse({ error: 'Missing planToken' }, 400);
    }

    const tokenPayload = decodePlanToken(planToken);
    if (!tokenPayload) {
      return jsonResponse({ error: 'Invalid planToken' }, 400);
    }
    if (Date.now() > tokenPayload.exp) {
      return jsonResponse({ error: 'plan_stale', message: 'Plan token expired' }, 409);
    }

    try {
      const { plan, hash } = await buildRemotePlan(serviceClient);
      if (hash !== tokenPayload.hash) {
        return jsonResponse({
          error: 'plan_stale',
          message: 'Official feed changed since preview — check again',
        }, 409);
      }

      if (!isPlanApplicable(plan)) {
        return jsonResponse({
          ok: true,
          applied: summarizePlan({ ...plan, updates: [], moves: [], inserts: [], deletes: [] }),
          skipped: {
            blockedMoves: plan.moves.filter((move) => move.blocked).length,
            blockedDeletes: plan.deletes.filter((del) => del.blocked && !confirmDeletes).length,
          },
          cacheVersion: '',
          report: 'Nothing applicable to apply.',
          message: 'No applicable changes',
        });
      }

      const result = await applyLineupPlan(serviceClient, plan, { confirmDeletes });
      return jsonResponse({
        ok: true,
        applied: result.applied,
        skipped: result.skipped,
        cacheVersion: result.cacheVersion,
        report: result.log.join('\n'),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Apply failed';
      return jsonResponse({ ok: false, error: message }, 500);
    }
  }

  return jsonResponse({ error: 'Invalid action' }, 400);
});
