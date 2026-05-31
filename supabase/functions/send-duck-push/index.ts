/**
 * send-duck-push
 *
 * Triggered by a Supabase Database Webhook on duck_quacks INSERT.
 * For each user who picked the same band (excluding the quacker),
 * retrieves their push subscriptions and sends a Web Push notification
 * via the `npm:web-push` Deno module.
 *
 * Required Supabase secrets (set via `supabase secrets set`):
 *   VAPID_PUBLIC_KEY   — VAPID public key (base64url)
 *   VAPID_PRIVATE_KEY  — VAPID private key (base64url)
 *   VAPID_SUBJECT      — mailto: or https: contact URI
 *
 * Database Webhook setup (Supabase Dashboard → Database → Webhooks):
 *   Table: duck_quacks
 *   Events: INSERT
 *   HTTP method: POST
 *   URL: https://<project>.supabase.co/functions/v1/send-duck-push
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
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing Supabase config');
      return new Response(JSON.stringify({ error: 'Server misconfigured' }), { status: 500 });
    }

    const body = await req.json() as {
      record?: { user_id: string; band_id: string };
      new?: { user_id: string; band_id: string };
    };

    const record = body.record ?? body.new;
    if (!record) {
      console.warn('No record in webhook payload');
      return new Response(JSON.stringify({ error: 'No record' }), { status: 400 });
    }

    const { user_id: quackerId, band_id: bandId } = record;
    console.log(`Processing duck quack: user=${quackerId}, band=${bandId}`);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Find all other users who picked this band
    const { data: picks, error: picksError } = await supabase
      .from('user_picks')
      .select('user_id')
      .eq('band_id', bandId)
      .neq('user_id', quackerId);

    if (picksError) {
      console.error('Error fetching picks:', picksError);
      return new Response(JSON.stringify({ error: 'DB error', detail: picksError.message }), { status: 500 });
    }

    if (!picks?.length) {
      console.log('No other users picked this band');
      return new Response(JSON.stringify({ sent: 0, failed: 0 }), { status: 200 });
    }

    // Get band name for the notification
    const { data: band } = await supabase
      .from('bands')
      .select('name')
      .eq('id', bandId)
      .single();

    const bandName = band?.name ?? '🤘';
    const recipientIds = picks.map((p: { user_id: string }) => p.user_id);
    console.log(`Found ${recipientIds.length} recipients for band ${bandName}`);

    // Fetch push subscriptions for all recipient users
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .in('user_id', recipientIds);

    if (subError) {
      console.error('Error fetching subscriptions:', subError);
      return new Response(JSON.stringify({ error: 'DB error', detail: subError.message }), { status: 500 });
    }

    if (!subscriptions?.length) {
      console.log('No push subscriptions found for recipients');
      return new Response(JSON.stringify({ sent: 0, failed: 0 }), { status: 200 });
    }

    const payload = JSON.stringify({
      title: bandName,
      body: '🦆 quack!',
    });

    console.log(`Sending duck quack to ${subscriptions.length} subscriptions`);

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

    console.log(`Duck quack sent: ${sent} succeeded, ${failed} failed`);

    return new Response(JSON.stringify({ sent, failed, errors }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('send-duck-push error:', err);
    return new Response(JSON.stringify({ error: 'Server error', detail: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
