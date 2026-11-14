-- Reversa de 017. Las rutinas ya compartidas se conservan (son de quien las recibió).
drop function if exists public.partner_weekly_summary(integer);
drop function if exists public.share_routine_with_partner(uuid);
drop function if exists public.my_partner();
drop function if exists public.set_partner_sharing(boolean);
drop function if exists public.respond_partner(uuid, boolean);
drop function if exists public.invite_partner(text);
drop table if exists public.partner_links;
delete from public.app_migrations where name = '017_partner.sql';
notify pgrst, 'reload schema';
