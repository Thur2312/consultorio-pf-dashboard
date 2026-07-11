-- Fluxo padrão (template inicial) para projetos onde a migration anterior
-- já tinha sido aplicada antes deste seed existir.
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
