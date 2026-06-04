/**
 * send-test-push
 *
 * Sends a test Web Push notification. Two modes:
 *
 * 1. Self-test (no body / no targetUserId):
 *    Sends to the calling user's own push subscription(s). Available to any
 *    logged-in user. Useful for verifying the full push stack end-to-end.
 *
 * 2. Targeted test (body: { targetUserId: string }):
 *    Sends to a specific user's push subscription(s). Godlike only.
 *    Used by the admin app's Test Push card.
 *
 * Auth: Bearer JWT (Supabase user token).
 *
 * Required Supabase secrets:
 *   VAPID_PUBLIC_KEY   — same key used by send-duck-push
 *   VAPID_PRIVATE_KEY  — same key used by send-duck-push
 *   VAPID_SUBJECT      — mailto: or https: contact URI
 */

import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY');
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY');
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:sfilizzola@gmail.com';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  console.error('Missing required environment variables');
}

try {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY || '', VAPID_PRIVATE_KEY || '');
} catch (e) {
  console.error('Failed to set VAPID details:', e);
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: { ...CORS_HEADERS, 'Access-Control-Max-Age': '86400' } });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Missing auth' }, 401);
    }
    const jwt = authHeader.slice(7);

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return json({ error: 'Server misconfigured' }, 500);
    }

    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: { user }, error: authError } = await serviceClient.auth.getUser(jwt);
    if (authError || !user) {
      return json({ error: 'Invalid token' }, 401);
    }

    // Parse optional targetUserId from body
    let targetUserId: string | null = null;
    try {
      const body = await req.json();
      if (body?.targetUserId && typeof body.targetUserId === 'string') {
        targetUserId = body.targetUserId;
      }
    } catch {
      // No body or invalid JSON — self-test mode
    }

    // Targeted mode: godlike-only check
    if (targetUserId) {
      const { data: callerRow, error: roleError } = await serviceClient
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (roleError || callerRow?.role !== 'godlike') {
        return json({ error: 'Forbidden — godlike only' }, 403);
      }
    }

    const recipientId = targetUserId ?? user.id;

    const { data: subscriptions, error: subError } = await serviceClient
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', recipientId);

    if (subError) {
      return json({ error: 'DB error', detail: subError.message }, 500);
    }

    if (!subscriptions?.length) {
      return json(
        { error: 'no_subscription', message: 'No push subscription found for this user.' },
        404,
      );
    }

    const payload = JSON.stringify({
      title: '🦆 Test Push',
      body: 'Push notifications are working! 🤘',
    });

    const results = await Promise.allSettled(
      subscriptions.map((sub: { endpoint: string; p256dh: string; auth: string }) =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        ),
      ),
    );

    const sent   = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    const errors = results
      .filter(r => r.status === 'rejected')
      .map(r => (r as PromiseRejectedResult).reason?.message ?? 'unknown');

    return json({ sent, failed, errors });
  } catch (err) {
    console.error('send-test-push error:', err);
    return json({ error: 'Server error', detail: String(err) }, 500);
  }
});
