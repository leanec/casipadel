-- Casi Pádel · Fase 2: liga compartida tras PIN.
-- La tabla leagues guarda TODO el documento League de la app (JSONB) y no tiene
-- políticas RLS: nadie lee/escribe con la anon key. Las edge functions (service
-- role) verifican el PIN y son la única puerta.
-- league_meta es un espejo público (solo la revisión) para realtime sin exponer datos.

create table if not exists leagues (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  pin_hash   text not null,
  data       jsonb not null,
  revision   integer not null default 1,
  updated_at timestamptz not null default now()
);

create table if not exists league_meta (
  league_id  uuid primary key references leagues(id) on delete cascade,
  revision   integer not null,
  updated_at timestamptz not null default now()
);

alter table leagues     enable row level security;
alter table league_meta enable row level security;

drop policy if exists "meta publica" on league_meta;
create policy "meta publica" on league_meta
  for select to anon using (true);

-- espeja la revisión para disparar el realtime
create or replace function sync_league_meta() returns trigger as $$
begin
  insert into league_meta (league_id, revision, updated_at)
  values (new.id, new.revision, new.updated_at)
  on conflict (league_id) do update
    set revision = excluded.revision,
        updated_at = excluded.updated_at;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists leagues_meta on leagues;
create trigger leagues_meta
  after insert or update on leagues
  for each row execute function sync_league_meta();

-- realtime sobre el espejo (idempotente)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'league_meta'
  ) then
    alter publication supabase_realtime add table league_meta;
  end if;
end $$;
