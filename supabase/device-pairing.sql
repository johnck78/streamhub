begin;

create schema if not exists streamhub_private;
revoke all on schema streamhub_private from public, anon, authenticated;

create table if not exists streamhub_private.device_pairing (
  id uuid primary key,
  submit_proof text not null,
  read_proof text not null,
  expires_at timestamptz not null,
  payload text
);
alter table streamhub_private.device_pairing enable row level security;
revoke all on streamhub_private.device_pairing from public, anon, authenticated;

create or replace function public.streamhub_pair_start(p_id uuid, p_submit text, p_read text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_id is null or p_submit is null or p_read is null
     or p_submit !~ '^[A-Za-z0-9_-]{43}$' or p_read !~ '^[A-Za-z0-9_-]{43}$' then
    raise exception 'Invalid pairing request';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(936178024);
  update streamhub_private.device_pairing
    set id = p_id, submit_proof = p_submit, read_proof = p_read,
        expires_at = now() + interval '5 minutes', payload = null
    where id = (select id from streamhub_private.device_pairing
      where expires_at <= now() order by expires_at limit 1);
  if found then return; end if;
  if (select count(*) from streamhub_private.device_pairing) >= 64 then
    raise exception 'Pairing is busy. Try again in a few minutes.';
  end if;
  insert into streamhub_private.device_pairing (id, submit_proof, read_proof, expires_at)
    values (p_id, p_submit, p_read, now() + interval '5 minutes');
end;
$$;

create or replace function public.streamhub_pair_send(p_id uuid, p_submit text, p_payload text)
returns boolean language sql security definer set search_path = '' as $$
  with sent as (
    update streamhub_private.device_pairing set payload = p_payload
    where id = p_id and submit_proof = p_submit and expires_at > now()
      and payload is null and length(p_payload) between 44 and 12000
      and p_payload ~ '^[A-Za-z0-9_-]+$'
    returning 1
  )
  select exists (select 1 from sent);
$$;

create or replace function public.streamhub_pair_take(p_id uuid, p_read text)
returns text language plpgsql security definer set search_path = '' as $
declare
  packet text;
begin
  select payload into packet from streamhub_private.device_pairing
    where id = p_id and read_proof = p_read and expires_at > now() and payload is not null
    for update;
  if found then
    update streamhub_private.device_pairing set expires_at = now(), payload = null where id = p_id;
  end if;
  return packet;
end;
$;

create or replace function public.streamhub_pair_cancel(p_id uuid, p_read text)
returns void language sql security definer set search_path = '' as $$
  update streamhub_private.device_pairing set expires_at = now(), payload = null
    where id = p_id and read_proof = p_read and expires_at > now();
$$;

revoke execute on function public.streamhub_pair_start(uuid,text,text),
  public.streamhub_pair_send(uuid,text,text), public.streamhub_pair_take(uuid,text),
  public.streamhub_pair_cancel(uuid,text) from public, anon, authenticated;
grant execute on function public.streamhub_pair_start(uuid,text,text),
  public.streamhub_pair_send(uuid,text,text), public.streamhub_pair_take(uuid,text),
  public.streamhub_pair_cancel(uuid,text) to anon;

commit;
