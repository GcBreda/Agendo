-- Valor de cada consulta, gravado na hora de marcar. O resumo financeiro soma este valor,
-- então mudar o preço do profissional depois não muda os meses que já passaram.
-- As consultas que já existem recebem o valor atual do profissional de cada uma.

-- AlterTable: primeiro sem obrigatoriedade, para dar tempo de preencher as linhas que já existem
ALTER TABLE "agendamentos" ADD COLUMN "valor" DECIMAL(10,2);

UPDATE "agendamentos" AS a
SET "valor" = p."valor_sessao"
FROM "profissionais" AS p
WHERE p."id" = a."profissional_id";

-- Toda consulta tem profissional (chave estrangeira obrigatória), então nenhuma fica sem valor
ALTER TABLE "agendamentos" ALTER COLUMN "valor" SET NOT NULL;
