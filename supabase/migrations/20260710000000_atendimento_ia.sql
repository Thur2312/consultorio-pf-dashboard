-- ─── Módulo Atendimento IA (WhatsApp) ───────────────────────────────────────
-- Fase 2: schema real para persistir o que hoje está mockado no frontend
-- (src/data/mockAtendimentoIA.ts / src/contexts/AtendimentoIAContext.tsx).
--
-- Segue o mesmo padrão das tabelas existentes (leads, patients, profiles):
-- clínica única, RLS permissivo para qualquer usuário autenticado (médico,
-- recepcionista ou admin), sem multi-tenancy por doctor_id nas policies.

create extension if not exists pgcrypto;

-- ─── Conversas ──────────────────────────────────────────────────────────────

create table if not exists ia_conversations (
  id                    uuid primary key default gen_random_uuid(),
  patient_id            uuid references patients(id),
  paciente_telefone     text not null,
  paciente_nome         text,
  status                text not null default 'ia_ativa'
                          check (status in ('ia_ativa', 'aguardando_humano', 'humano_ativo', 'resolvido')),
  atendente_atual       text not null default 'ia', -- 'ia' ou profiles.id (uuid como texto) de quem assumiu
  ultima_mensagem       text,
  ultima_mensagem_at    timestamptz default now(),
  nao_lidas             int not null default 0,
  tags                  text[] not null default '{}',
  notas_internas        text default '',
  motivo_transferencia  text,
  created_at            timestamptz not null default now()
);

create index if not exists ia_conversations_status_idx on ia_conversations (status);
create index if not exists ia_conversations_telefone_idx on ia_conversations (paciente_telefone);

-- ─── Mensagens ──────────────────────────────────────────────────────────────

create table if not exists ia_messages (
  id                 uuid primary key default gen_random_uuid(),
  conversation_id    uuid not null references ia_conversations(id) on delete cascade,
  remetente          text not null check (remetente in ('ia', 'humano', 'paciente')),
  conteudo           text not null,
  uazapi_message_id  text, -- id da mensagem retornado pela uazapi (para status/webhook de entrega)
  enviado_em         timestamptz not null default now(),
  status_entrega     text not null default 'enviado'
                       check (status_entrega in ('enviado', 'entregue', 'lido', 'falhou'))
);

create index if not exists ia_messages_conversation_idx on ia_messages (conversation_id, enviado_em);

-- ─── Log de handoff (transferência IA <-> humano) ─────────────────────────

create table if not exists ia_handoff_logs (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid not null references ia_conversations(id) on delete cascade,
  tipo             text not null check (tipo in ('transferencia', 'retomada')),
  motivo           text not null,
  autor            text not null, -- 'IA' ou nome do profile que assumiu/devolveu
  criado_em        timestamptz not null default now()
);

create index if not exists ia_handoff_logs_conversation_idx on ia_handoff_logs (conversation_id);

-- ─── Fluxo do agente (canvas estilo n8n) ───────────────────────────────────

create table if not exists ia_flow_nodes (
  id              uuid primary key default gen_random_uuid(),
  tipo            text not null check (tipo in ('inicio', 'ia', 'condicao', 'handoff', 'fim')),
  titulo          text not null,
  descricao       text,
  condicao_texto  text,
  persona_id      uuid, -- referencia ia_personas(id), nullable (fk abaixo, criada após a tabela existir)
  posicao_x       double precision not null default 0,
  posicao_y       double precision not null default 0,
  ativo           boolean not null default true
);

create table if not exists ia_flow_edges (
  id              uuid primary key default gen_random_uuid(),
  source_node_id  uuid not null references ia_flow_nodes(id) on delete cascade,
  target_node_id  uuid not null references ia_flow_nodes(id) on delete cascade,
  label           text
);

-- ─── Persona do agente (planilha) ──────────────────────────────────────────

create table if not exists ia_personas (
  id             uuid primary key default gen_random_uuid(),
  arquivo_nome   text not null,
  enviado_por    uuid references profiles(id),
  versao         int not null,
  ativa          boolean not null default false,
  colunas        text[] not null default '{}',
  dados          jsonb not null default '[]', -- linhas parseadas da planilha (colunas dinâmicas)
  enviado_em     timestamptz not null default now()
);

create unique index if not exists ia_personas_ativa_unica
  on ia_personas ((true)) where (ativa);

do $$
begin
  alter table ia_flow_nodes
    add constraint ia_flow_nodes_persona_fkey
    foreign key (persona_id) references ia_personas(id);
exception when duplicate_object then null;
end $$;

-- ─── Configuração do agente (IA + UazAPI) ──────────────────────────────────
--
-- IMPORTANTE — segurança das chaves de API:
-- as colunas *_encrypted NUNCA devem ser gravadas/lidas pelo client com a
-- anon key. Toda leitura/escrita passa por uma Edge Function usando a
-- service_role key, que criptografa antes de gravar (ex: pgsodium/Supabase
-- Vault, ou libsodium com uma chave guardada em secret da função) e nunca
-- devolve o valor em texto puro — apenas os últimos 4 caracteres via a view
-- `ia_agent_config_public` abaixo.

create table if not exists ia_agent_config (
  id                        uuid primary key default gen_random_uuid(),
  provedor_ia               text not null default 'anthropic' check (provedor_ia in ('openai', 'anthropic', 'outro')),
  modelo                    text not null default 'claude-sonnet-5',
  api_key_encrypted         text,          -- nunca exposta ao client; só a Edge Function lê
  uazapi_base_url           text not null default 'https://api.uazapi.com', -- 'https://free.uazapi.com' no plano free
  uazapi_instance_id        text,          -- id da instância criada via POST /instance/create da uazapi
  uazapi_token_encrypted    text,          -- header `token` usado nas chamadas à uazapi; nunca exposto ao client
  uazapi_numero             text,
  uazapi_status             text not null default 'desconectado'
                              check (uazapi_status in ('conectado', 'desconectado', 'aguardando_qr')),
  webhook_secret            text not null default encode(extensions.gen_random_bytes(16), 'hex'), -- valida chamadas em uazapi-webhook/:secret
  webhook_url               text,          -- preenchida após o deploy da function uazapi-webhook (ver README)
  agente_ativo              boolean not null default true,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

-- Garante uma única linha de configuração (clínica única, mesmo padrão das demais tabelas)
create unique index if not exists ia_agent_config_singleton on ia_agent_config ((true));

-- View segura para o frontend: nunca expõe as colunas *_encrypted inteiras,
-- apenas um indicador de "configurada" (o mascaramento com os 4 últimos
-- dígitos é feito pela Edge Function no momento em que a chave é salva,
-- e fica guardado em api_key_mascarada / uazapi_token_mascarada abaixo).
alter table ia_agent_config add column if not exists api_key_mascarada text;
alter table ia_agent_config add column if not exists uazapi_token_mascarada text;
alter table ia_agent_config add column if not exists uazapi_base_url text not null default 'https://api.uazapi.com';
alter table ia_agent_config add column if not exists webhook_secret text not null default encode(extensions.gen_random_bytes(16), 'hex');
alter table ia_agent_config alter column webhook_url drop not null;

drop view if exists ia_agent_config_public;
create view ia_agent_config_public as
select
  id, provedor_ia, modelo,
  (api_key_encrypted is not null) as api_key_configurada, api_key_mascarada,
  uazapi_base_url, uazapi_instance_id,
  (uazapi_token_encrypted is not null) as uazapi_token_configurada, uazapi_token_mascarada,
  uazapi_numero, uazapi_status, webhook_url, agente_ativo, created_at, updated_at
from ia_agent_config;

-- ─── RLS ────────────────────────────────────────────────────────────────────
-- Mesmo padrão das tabelas existentes: qualquer usuário autenticado
-- (médico, recepcionista ou admin) tem acesso de leitura/escrita.
-- As colunas *_encrypted em ia_agent_config ficam fora do alcance do client
-- porque o frontend deve consultar sempre a view `ia_agent_config_public`
-- (nunca a tabela base) e a escrita das chaves passa por Edge Function
-- com service_role, não pela policy abaixo.

alter table ia_conversations enable row level security;
alter table ia_messages      enable row level security;
alter table ia_handoff_logs  enable row level security;
alter table ia_flow_nodes    enable row level security;
alter table ia_flow_edges    enable row level security;
alter table ia_personas      enable row level security;
alter table ia_agent_config  enable row level security;

drop policy if exists "authenticated_full_access" on ia_conversations;
create policy "authenticated_full_access" on ia_conversations for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
drop policy if exists "authenticated_full_access" on ia_messages;
create policy "authenticated_full_access" on ia_messages for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
drop policy if exists "authenticated_full_access" on ia_handoff_logs;
create policy "authenticated_full_access" on ia_handoff_logs for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
drop policy if exists "authenticated_full_access" on ia_flow_nodes;
create policy "authenticated_full_access" on ia_flow_nodes for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
drop policy if exists "authenticated_full_access" on ia_flow_edges;
create policy "authenticated_full_access" on ia_flow_edges for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
drop policy if exists "authenticated_full_access" on ia_personas;
create policy "authenticated_full_access" on ia_personas for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ia_agent_config: nenhuma policy de SELECT/INSERT/UPDATE para authenticated
-- na tabela base (fica só para service_role, usado pelas Edge Functions).
-- O client autenticado lê apenas a view pública abaixo.
grant select on ia_agent_config_public to authenticated;

-- Habilita realtime para o dashboard (badge/toast de handoff em tempo real).
-- Bloco idempotente: não falha se a tabela já estiver na publicação.
do $$
begin
  begin
    execute 'alter publication supabase_realtime add table ia_conversations';
  exception when duplicate_object then null;
  end;
  begin
    execute 'alter publication supabase_realtime add table ia_handoff_logs';
  exception when duplicate_object then null;
  end;
  begin
    execute 'alter publication supabase_realtime add table ia_messages';
  exception when duplicate_object then null;
  end;
end $$;

-- Garante uma linha única de configuração (a UI sempre lê/atualiza esta linha)
insert into ia_agent_config (provedor_ia, modelo)
select 'anthropic', 'claude-sonnet-5'
where not exists (select 1 from ia_agent_config);

-- ─── Fluxo padrão (template inicial) ───────────────────────────────────────
-- Todo cliente começa com este fluxo de exemplo (Início → IA → Condição →
-- Handoff → Fim), que pode editar livremente no Canvas do Agente. Só roda
-- na primeira aplicação da migration (tabela vazia).
do $$
declare
  n1 uuid; n2 uuid; n3 uuid; n4 uuid; n5 uuid; n6 uuid;
begin
  if exists (select 1 from ia_flow_nodes) then
    return;
  end if;

  insert into ia_flow_nodes (tipo, titulo, descricao, posicao_x, posicao_y, ativo)
    values ('inicio', 'Nova mensagem recebida', null, 40, 160, true) returning id into n1;
  insert into ia_flow_nodes (tipo, titulo, descricao, posicao_x, posicao_y, ativo)
    values ('ia', 'Resposta da IA', 'Usa a persona ativa configurada', 320, 160, true) returning id into n2;
  insert into ia_flow_nodes (tipo, titulo, condicao_texto, posicao_x, posicao_y, ativo)
    values ('condicao', 'Paciente pediu atendente?', 'Se a mensagem do paciente contiver pedido explícito por atendimento humano', 620, 40, true) returning id into n3;
  insert into ia_flow_nodes (tipo, titulo, condicao_texto, posicao_x, posicao_y, ativo)
    values ('condicao', 'Está em horário comercial?', 'Segunda a sexta, das 08h às 18h', 620, 280, true) returning id into n4;
  insert into ia_flow_nodes (tipo, titulo, descricao, posicao_x, posicao_y, ativo)
    values ('handoff', 'Transferir para humano', 'Notifica o secretário responsável', 920, 160, true) returning id into n5;
  insert into ia_flow_nodes (tipo, titulo, descricao, posicao_x, posicao_y, ativo)
    values ('fim', 'Conversa encerrada', null, 1180, 160, true) returning id into n6;

  insert into ia_flow_edges (source_node_id, target_node_id, label) values
    (n1, n2, null),
    (n2, n3, null),
    (n3, n5, 'Sim'),
    (n3, n4, 'Não'),
    (n4, n5, 'Fora do horário'),
    (n4, n6, 'Dentro do horário');
end $$;
