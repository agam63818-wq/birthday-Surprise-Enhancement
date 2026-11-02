-- OPTIONAL proposal: stronger, server-side record of Terms/Privacy consent.
-- NOT applied automatically. Review, then run manually if wanted.
--
-- Today consent is saved in auth.users.raw_user_meta_data at signup
-- (terms_accepted_at, terms_version, privacy_version). user_metadata is
-- client-writable, so it is a convenience record, not tamper-proof evidence.
-- This table copies that record once, server-side, at user creation, and
-- users can only READ their own rows.

create table if not exists public.legal_consents (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  terms_version text,
  privacy_version text,
  accepted_at timestamptz,            -- value the client reported
  recorded_at timestamptz not null default now()  -- trusted server time
);

alter table public.legal_consents enable row level security;

create policy "Users read own consents"
  on public.legal_consents for select
  using (auth.uid() = user_id);
-- No insert/update/delete policies: only the trigger below (security definer) writes.

create or replace function public.record_signup_consent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.raw_user_meta_data ? 'terms_version' then
    insert into public.legal_consents (user_id, terms_version, privacy_version, accepted_at)
    values (
      new.id,
      new.raw_user_meta_data ->> 'terms_version',
      new.raw_user_meta_data ->> 'privacy_version',
      nullif(new.raw_user_meta_data ->> 'terms_accepted_at', '')::timestamptz
    );
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_record_consent on auth.users;
create trigger on_auth_user_created_record_consent
  after insert on auth.users
  for each row execute function public.record_signup_consent();
