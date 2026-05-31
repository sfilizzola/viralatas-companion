/**
 * send-test-push
 *
 * Sends a test Web Push notification directly to the calling user's own
 * registered push subscription(s). Useful for admins to verify that the
 * full push stack (VAPID keys, push_subscriptions table, Service Worker
 * push handler) is working end-to-end without needing a second user.
 *
 * Auth: Bearer JWT (Supabase user token). Only a logged-in user can
 * request a test push to themselves — no privileged role required.
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

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': req.headers.get('Access-Control-Request-Headers') || '*',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  try {
    // Extract the caller's JWT to identify them
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing auth' }), { status: 401, headers: { 'Access-Control-Allow-Origin': '*' } });
    }
    const jwt = authHeader.slice(7);

    // Use service role client for DB queries, but verify JWT first
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing Supabase config');
      return new Response(JSON.stringify({ error: 'Server misconfigured' }), {
        status: 500,
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    }

    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: { user }, error: authError } = await serviceClient.auth.getUser(jwt);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    }

    // Look up this user's push subscription(s)
    const { data: subscriptions, error: subError } = await serviceClient
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', user.id);

    if (subError) {
      return new Response(JSON.stringify({ error: 'DB error', detail: subError.message }), {
        status: 500,
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    }

    if (!subscriptions?.length) {
      return new Response(
        JSON.stringify({
          error: 'no_subscription',
          message: 'No push subscription found for this user. Make sure push permission was granted.',
        }),
        {
          status: 404,
          headers: { 'Access-Control-Allow-Origin': '*' },
        },
      );
    }

    const payload = JSON.stringify({
      title: '🦆 Test Push',
      body: 'Push notifications are working! 🤘',
    });

    const results = await Promise.allSettled(
      subscriptions.map((sub: { endpoint: string; p256dh: string; auth: string }) =>
        webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload,
        ),
      ),
    );

    const sent = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;
    const errors = results
      .filter((r) => r.status === 'rejected')
      .map((r) => (r as PromiseRejectedResult).reason?.message ?? 'unknown');

    return new Response(JSON.stringify({ sent, failed, errors }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    console.error('send-test-push error:', err);
    return new Response(JSON.stringify({ error: 'Server error', detail: String(err) }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
});
