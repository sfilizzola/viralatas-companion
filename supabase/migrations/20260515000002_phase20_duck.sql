-- Phase 20: The Duck 🦆
-- duck_quacks: stores each quack event; realtime-enabled
-- push_subscriptions: stores Web Push VAPID subscriptions per device

CREATE TABLE public.duck_quacks (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  band_id     uuid        NOT NULL REFERENCES public.bands(id) ON DELETE CASCADE,
  quacked_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.duck_quacks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own quacks"
  ON public.duck_quacks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can read quacks"
  ON public.duck_quacks FOR SELECT
  USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.duck_quacks;

-- push_subscriptions: one row per device per user
CREATE TABLE public.push_subscriptions (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint    text        NOT NULL UNIQUE,
  p256dh      text        NOT NULL,
  auth        text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own push subscriptions"
  ON public.push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own push subscriptions"
  ON public.push_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can select own push subscriptions"
  ON public.push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);
