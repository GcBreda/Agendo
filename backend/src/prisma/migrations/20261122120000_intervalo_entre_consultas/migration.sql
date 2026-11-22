-- Intervalo entre uma consulta e a próxima, escolhido pelo profissional em "Meus horários" (em minutos).
-- Só acrescenta a coluna, com padrão 0: quem já existe continua com os mesmos horários de antes.
-- AlterTable
ALTER TABLE "profissionais" ADD COLUMN     "intervalo_min" INTEGER NOT NULL DEFAULT 0;
