-- Dados visuais/identificação do cartão.
-- Não armazene número completo do cartão nem CVV.

alter table public.credit_cards
  add column if not exists apelido text,
  add column if not exists nome_titular text,
  add column if not exists ultimos_4 varchar(4),
  add column if not exists validade_mes smallint,
  add column if not exists validade_ano smallint,
  add column if not exists bandeira text;

-- Validações simples para impedir dados inválidos.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'credit_cards_ultimos_4_check'
  ) then
    alter table public.credit_cards
      add constraint credit_cards_ultimos_4_check
      check (ultimos_4 is null or ultimos_4 ~ '^[0-9]{4}$');
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'credit_cards_validade_mes_check'
  ) then
    alter table public.credit_cards
      add constraint credit_cards_validade_mes_check
      check (validade_mes is null or validade_mes between 1 and 12);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'credit_cards_validade_ano_check'
  ) then
    alter table public.credit_cards
      add constraint credit_cards_validade_ano_check
      check (validade_ano is null or validade_ano between 2026 and 2099);
  end if;
end $$;

comment on column public.credit_cards.apelido is 'Apelido opcional do cartão, por exemplo Principal ou Compras';
comment on column public.credit_cards.nome_titular is 'Nome exibido no cartão; não é dado de autenticação';
comment on column public.credit_cards.ultimos_4 is 'Somente os quatro últimos dígitos; nunca salvar o PAN completo';
comment on column public.credit_cards.validade_mes is 'Mês visual de validade do cartão';
comment on column public.credit_cards.validade_ano is 'Ano visual de validade do cartão';
comment on column public.credit_cards.bandeira is 'Bandeira visual: Mastercard, Visa, Elo, American Express, Hipercard ou Outra';
