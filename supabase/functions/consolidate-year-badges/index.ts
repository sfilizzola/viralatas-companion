import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getEarnedBadges } from './engine.ts';
import {
  buildServerBadgeContext,
  isFestivalEndedServer,
  type ServerAuthMetadata,
  type ServerUserRow,
} from './contextBuilder.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type ConsolidateRequest = {
  year?: number;
  force?: boolean;
  dryRun?: boolean;
};

type ConsolidateResponse = {
  dryRun: false;
  processedUsers: number;
  savedBadges: number;
  skipped: number;
  errors: string[];
};

interface DryRunBadgeEntry {
  slug: string;
  imagePath: string;
  labelKey: string;
}

interface DryRunUserEntry {
  userId: string;
  displayName: string;
  badges: DryRunBadgeEntry[];
}

interface DryRunResponse {
  dryRun: true;
  totalBadges: number;
  processedUsers: number;
  skipped: number;
  users: DryRunUserEntry[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing authorization' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data: callerRow } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (callerRow?.role !== 'godlike') {
    return new Response(JSON.stringify({ error: 'Forbidden: godlike only' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: ConsolidateRequest;
  try {
    body = await req.json() as ConsolidateRequest;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const year = body.year;
  if (typeof year !== 'number' || !Number.isInteger(year) || year < 2000) {
    return new Response(JSON.stringify({ error: 'Invalid year' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const force = body.force === true;
  const dryRun = body.dryRun === true;
  const at = new Date();

  const [
    { data: bands, error: bandsError },
    { data: picks, error: picksError },
    { data: missed, error: missedError },
    { data: presence, error: presenceError },
    { data: users, error: usersError },
  ] = await Promise.all([
    supabase.from('bands').select('id, name, stage, start_time, end_time, genre, category'),
    supabase.from('user_picks').select('user_id, band_id'),
    supabase.from('user_missed_bands').select('user_id, band_id'),
    supabase.from('user_presence').select('user_id, is_camping, is_at_metal_place'),
    supabase
      .from('users')
      .select('id, special_badges, wacken_years, country, wacken_arrival_day, is_friend, is_test_user')
      .eq('is_test_user', false),
  ]);

  if (bandsError || picksError || missedError || presenceError || usersError) {
    return new Response(JSON.stringify({
      error: bandsError?.message ?? picksError?.message ?? missedError?.message
        ?? presenceError?.message ?? usersError?.message ?? 'Failed to load data',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!force && !isFestivalEndedServer(at, bands ?? [])) {
    return new Response(JSON.stringify({ error: 'Festival has not ended yet' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const bulk = {
    bands: bands ?? [],
    picks: picks ?? [],
    missed: missed ?? [],
    presence: presence ?? [],
    crewUsers: (users ?? []).map((row) => ({
      id: row.id,
      display_name: null,
      is_friend: row.is_friend,
    })),
  };

  const dryRunUsers: DryRunUserEntry[] = [];
  let dryRunTotalBadges = 0;

  const result: ConsolidateResponse = {
    dryRun: false,
    processedUsers: 0,
    savedBadges: 0,
    skipped: 0,
    errors: [],
  };

  for (const row of users ?? []) {
    result.processedUsers += 1;

    try {
      const { data: authData, error: authFetchError } = await supabase.auth.admin.getUserById(row.id);
      if (authFetchError || !authData.user) {
        result.errors.push(`${row.id}: ${authFetchError?.message ?? 'auth user missing'}`);
        continue;
      }

      const metadata = (authData.user.user_metadata ?? {}) as ServerAuthMetadata;
      const ctx = buildServerBadgeContext(row as ServerUserRow, metadata, bulk, at);
      const earned = getEarnedBadges(ctx).filter((badge) => badge.year === year);

      if (earned.length === 0) {
        result.skipped += 1;
        continue;
      }

      if (dryRun) {
        dryRunUsers.push({
          userId: row.id,
          displayName: authData.user.email?.split('@')[0] ?? row.id,
          badges: earned.map((b) => ({
            slug: b.slug,
            imagePath: b.imagePath,
            labelKey: b.labelKey,
          })),
        });
        dryRunTotalBadges += earned.length;
        continue;
      }

      const rows = earned.map((badge) => ({
        user_id: row.id,
        festival_year: year,
        slug: badge.slug,
        image_path: badge.imagePath,
        label_key: badge.labelKey,
      }));

      const { error: upsertError } = await supabase
        .from('user_badge_history')
        .upsert(rows, { onConflict: 'user_id,festival_year,slug' });

      if (upsertError) {
        result.errors.push(`${row.id}: ${upsertError.message}`);
        continue;
      }

      result.savedBadges += rows.length;
    } catch (err) {
      result.errors.push(`${row.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (dryRun) {
    const dryRunResult: DryRunResponse = {
      dryRun: true,
      totalBadges: dryRunTotalBadges,
      processedUsers: result.processedUsers,
      skipped: result.skipped,
      users: dryRunUsers,
    };
    return new Response(JSON.stringify(dryRunResult), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ ...result, dryRun: false }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
