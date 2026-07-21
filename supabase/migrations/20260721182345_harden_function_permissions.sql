revoke execute on function public.create_cookbook_for_current_user(text, text) from anon;
revoke execute on function public.join_cookbook_by_invite(text) from anon;

alter function public.set_updated_at() set search_path = public;
