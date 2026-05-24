import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
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

  // Verify caller identity via the user JWT.
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

  // Verify caller is godlike.
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

  const { targetUserId, badgeSlug, action } = await req.json() as {
    targetUserId: string;
    badgeSlug: string;
    action: 'assign' | 'revoke';
  };

  if (!targetUserId || !badgeSlug || !['assign', 'revoke'].includes(action)) {
    return new Response(JSON.stringify({ error: 'Invalid input' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data: targetRow, error: fetchError } = await supabase
    .from('users')
    .select('special_badges')
    .eq('id', targetUserId)
    .single();

  if (fetchError || !targetRow) {
    return new Response(JSON.stringify({ error: 'User not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const current: string[] = targetRow.special_badges ?? [];
  let updated: string[];

  if (action === 'assign') {
    updated = current.includes(badgeSlug) ? current : [...current, badgeSlug];
  } else {
    updated = current.filter((s) => s !== badgeSlug);
  }

  const { error: updateError } = await supabase
    .from('users')
    .update({ special_badges: updated })
    .eq('id', targetUserId);

  if (updateError) {
    return new Response(JSON.stringify({ error: updateError.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Mirror to auth user_metadata so the target user's cached session reflects
  // the change and assigned badges are visible offline (Phase 1 reads user_metadata).
  await supabase.auth.admin.updateUserById(targetUserId, {
    user_metadata: { special_badges: updated },
  });

  return new Response(JSON.stringify({ special_badges: updated }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
