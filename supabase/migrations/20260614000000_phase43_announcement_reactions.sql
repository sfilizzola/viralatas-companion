-- Phase 43: announcement reactions
CREATE TABLE public.announcement_reactions (
  announcement_id uuid NOT NULL
    REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL
    REFERENCES public.users(id) ON DELETE CASCADE,
  emoji           text NOT NULL
    CHECK (emoji IN ('🤘', '🍺', '🐶', '💀', '🔥', '😂', '👎', '👍')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (announcement_id, user_id, emoji)
);

CREATE INDEX announcement_reactions_by_announcement
  ON public.announcement_reactions (announcement_id);

ALTER TABLE public.announcement_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY announcement_reactions_select ON public.announcement_reactions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY announcement_reactions_insert ON public.announcement_reactions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY announcement_reactions_delete ON public.announcement_reactions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.announcement_reactions;
