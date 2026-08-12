-- Peer Join/Leave must refresh Active Festival crew roster while online.
-- Without this, late joiners' picks arrive via user_picks realtime but
-- crew_users stays stale → "Vira-lata XXXX" + missing avatar in band cells.
alter publication supabase_realtime add table public.festival_memberships;
