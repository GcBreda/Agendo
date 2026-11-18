-- Gatilhos de "só inserção" (Tarefa 4).
-- O próprio banco recusa alterar ou apagar o histórico do prontuário, o log de acesso
-- e o consentimento (CLAUDE.md, regras 3 e 4 do prontuário; LGPD art. 37 e 46).
-- As mensagens têm só o nome da tabela e da operação: nenhum dado do registro.
-- Limite conhecido: o dono da tabela ou um superusuário consegue desligar gatilhos.
-- Contra isso, a proteção é o usuário agendo_app sem ser dono das tabelas (B7).

-- 1. Tabelas de só inserção: uma função compartilhada
CREATE FUNCTION recusar_alteracao_so_insercao() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'SO_INSERCAO: % não é permitido em %', TG_OP, TG_TABLE_NAME;
END;
$$;

-- FOR EACH STATEMENT: dispara uma vez por comando, mesmo que nenhuma linha seja afetada.
-- TRUNCATE só aceita gatilho por comando, então os três ficam juntos.
CREATE TRIGGER prontuario_versoes_so_insercao
  BEFORE UPDATE OR DELETE OR TRUNCATE ON "prontuario_versoes"
  FOR EACH STATEMENT EXECUTE FUNCTION recusar_alteracao_so_insercao();

CREATE TRIGGER anotacoes_pessoais_so_insercao
  BEFORE UPDATE OR DELETE OR TRUNCATE ON "anotacoes_pessoais"
  FOR EACH STATEMENT EXECUTE FUNCTION recusar_alteracao_so_insercao();

CREATE TRIGGER logs_acesso_prontuario_so_insercao
  BEFORE UPDATE OR DELETE OR TRUNCATE ON "logs_acesso_prontuario"
  FOR EACH STATEMENT EXECUTE FUNCTION recusar_alteracao_so_insercao();

-- 2. Consentimentos: o único UPDATE aceito é preencher revogado_em, uma vez
CREATE FUNCTION consentimento_so_revogacao() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RAISE EXCEPTION 'CONSENTIMENTO: % não é permitido em consentimentos', TG_OP;
  END IF;
  IF OLD.revogado_em IS NOT NULL THEN
    RAISE EXCEPTION 'CONSENTIMENTO: consentimento já revogado';
  END IF;
  IF NEW.revogado_em IS NULL THEN
    RAISE EXCEPTION 'CONSENTIMENTO: só é permitido preencher revogado_em';
  END IF;
  -- Não se revoga antes de ter aceitado (igual ao aceite é aceito)
  IF NEW.revogado_em < OLD.aceito_em THEN
    RAISE EXCEPTION 'CONSENTIMENTO: revogado_em não pode ser anterior a aceito_em';
  END IF;
  -- Compara a linha inteira, menos revogado_em. Coluna criada no futuro
  -- já nasce protegida, sem precisar mexer neste gatilho.
  IF (to_jsonb(NEW) - 'revogado_em') IS DISTINCT FROM (to_jsonb(OLD) - 'revogado_em') THEN
    RAISE EXCEPTION 'CONSENTIMENTO: só é permitido preencher revogado_em';
  END IF;
  RETURN NEW;
END;
$$;

-- Por linha: precisa ver OLD (antes) e NEW (depois)
CREATE TRIGGER consentimentos_so_revogacao
  BEFORE UPDATE OR DELETE ON "consentimentos"
  FOR EACH ROW EXECUTE FUNCTION consentimento_so_revogacao();

CREATE TRIGGER consentimentos_sem_truncate
  BEFORE TRUNCATE ON "consentimentos"
  FOR EACH STATEMENT EXECUTE FUNCTION consentimento_so_revogacao();

-- 3. prontuarios (o ponteiro): nunca apagar; no UPDATE só avança
--    versao_atual de 1 em 1 (atualizado_em pode mudar junto, porque o Prisma o preenche)
CREATE FUNCTION prontuario_so_avanca_versao() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RAISE EXCEPTION 'PRONTUARIO: % não é permitido em prontuarios', TG_OP;
  END IF;
  -- Mesma técnica: a linha inteira, menos as colunas permitidas, não pode mudar
  IF (to_jsonb(NEW) - ARRAY['versao_atual', 'atualizado_em'])
     IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['versao_atual', 'atualizado_em']) THEN
    RAISE EXCEPTION 'PRONTUARIO: só é permitido avançar versao_atual';
  END IF;
  IF NEW.versao_atual IS DISTINCT FROM OLD.versao_atual + 1 THEN
    RAISE EXCEPTION 'PRONTUARIO: versao_atual precisa avançar de 1 em 1';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER prontuarios_so_avanca_versao
  BEFORE UPDATE OR DELETE ON "prontuarios"
  FOR EACH ROW EXECUTE FUNCTION prontuario_so_avanca_versao();

CREATE TRIGGER prontuarios_sem_truncate
  BEFORE TRUNCATE ON "prontuarios"
  FOR EACH STATEMENT EXECUTE FUNCTION prontuario_so_avanca_versao();
