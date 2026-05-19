alter table public.servicos
  add column if not exists usa_variacoes boolean not null default false,
  add column if not exists preco_variavel boolean not null default false,
  add column if not exists preco_min_jpy integer,
  add column if not exists preco_max_jpy integer,
  alter column preco_jpy drop not null;

create table if not exists public.servico_variacoes (
  id uuid primary key default gen_random_uuid(),
  servico_id uuid not null references public.servicos(id) on delete cascade,
  nome text not null,
  descricao text,
  preco_jpy integer check (preco_jpy >= 0),
  preco_variavel boolean not null default false,
  preco_min_jpy integer check (preco_min_jpy >= 0),
  preco_max_jpy integer check (preco_max_jpy >= 0),
  duracao_texto text,
  ativo boolean not null default true,
  ordem integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.servico_variacoes
  add column if not exists preco_variavel boolean not null default false,
  add column if not exists preco_min_jpy integer,
  add column if not exists preco_max_jpy integer,
  alter column preco_jpy drop not null;

create index if not exists servico_variacoes_servico_ordem_idx
  on public.servico_variacoes (servico_id, ordem);

create index if not exists servico_variacoes_servico_ativo_ordem_idx
  on public.servico_variacoes (servico_id, ativo, ordem);

alter table public.cliente_processos
  add column if not exists variacao_id uuid references public.servico_variacoes(id) on delete restrict;

do $$
begin
  if to_regclass('public.processos') is not null then
    alter table public.processos
      add column if not exists variacao_id uuid references public.servico_variacoes(id) on delete restrict;
  end if;
end $$;

do $$
begin
  alter table public.servicos
    drop constraint if exists servicos_preco_ou_variacoes_chk;

  if not exists (
    select 1 from pg_constraint where conname = 'servicos_preco_ou_variacoes_chk'
  ) then
    alter table public.servicos
      add constraint servicos_preco_ou_variacoes_chk
      check (
        (usa_variacoes = true and preco_jpy is null)
        or (
          usa_variacoes = false
          and (
            (preco_variavel = false and preco_jpy is not null)
            or (
              preco_variavel = true
              and preco_jpy is null
              and preco_min_jpy is not null
              and preco_max_jpy is not null
              and preco_max_jpy >= preco_min_jpy
            )
          )
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'servico_variacoes_preco_chk'
  ) then
    alter table public.servico_variacoes
      add constraint servico_variacoes_preco_chk
      check (
        (preco_variavel = false and preco_jpy is not null)
        or (
          preco_variavel = true
          and preco_jpy is null
          and preco_min_jpy is not null
          and preco_max_jpy is not null
          and preco_max_jpy >= preco_min_jpy
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'cliente_processos_variacao_servico_chk'
  ) then
    alter table public.cliente_processos
      add constraint cliente_processos_variacao_servico_chk
      check (variacao_id is null or servico_id is not null);
  end if;
end $$;
