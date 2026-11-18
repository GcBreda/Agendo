-- CreateEnum
CREATE TYPE "AcaoProntuario" AS ENUM ('LEITURA', 'CRIACAO', 'EDICAO', 'NEGADO');

-- CreateEnum
CREATE TYPE "RecursoProntuario" AS ENUM ('PRONTUARIO', 'ANOTACAO_PESSOAL');

-- CreateEnum
CREATE TYPE "MotivoNegado" AS ENUM ('PERFIL_NAO_PERMITIDO', 'ENTRADA_INVALIDA', 'SEM_VINCULO', 'SEM_CONSENTIMENTO', 'NAO_ENCONTRADO', 'VERSAO_DESATUALIZADA', 'FALHA_INTEGRIDADE');

-- CreateEnum
CREATE TYPE "BaseLegal" AS ENUM ('CONSENTIMENTO', 'TUTELA_SAUDE');

-- AlterTable
ALTER TABLE "prontuarios" DROP COLUMN "anotacoes",
DROP COLUMN "cid",
DROP COLUMN "lembretes",
ADD COLUMN     "versao_atual" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "prontuario_versoes" (
    "id" TEXT NOT NULL,
    "prontuario_id" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "conteudo_cifrado" BYTEA NOT NULL,
    "iv" BYTEA NOT NULL,
    "auth_tag" BYTEA NOT NULL,
    "chave_id" INTEGER NOT NULL DEFAULT 1,
    "autor_id" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prontuario_versoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anotacoes_pessoais" (
    "id" TEXT NOT NULL,
    "profissional_id" TEXT NOT NULL,
    "paciente_id" TEXT NOT NULL,
    "substitui_id" TEXT,
    "conteudo_cifrado" BYTEA NOT NULL,
    "iv" BYTEA NOT NULL,
    "auth_tag" BYTEA NOT NULL,
    "chave_id" INTEGER NOT NULL DEFAULT 1,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "anotacoes_pessoais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vinculos" (
    "id" TEXT NOT NULL,
    "profissional_id" TEXT NOT NULL,
    "paciente_id" TEXT NOT NULL,
    "inicio_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fim_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vinculos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consentimentos" (
    "id" TEXT NOT NULL,
    "paciente_id" TEXT NOT NULL,
    "versao_termo" TEXT NOT NULL,
    "finalidade" TEXT NOT NULL,
    "base_legal" "BaseLegal" NOT NULL,
    "aceito_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT NOT NULL,
    "revogado_em" TIMESTAMP(3),

    CONSTRAINT "consentimentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logs_acesso_prontuario" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "perfil" "Perfil" NOT NULL,
    "acao" "AcaoProntuario" NOT NULL,
    "recurso" "RecursoProntuario" NOT NULL,
    "motivo" "MotivoNegado",
    "paciente_id" TEXT,
    "prontuario_id" TEXT,
    "ip" TEXT,
    "ocorrido_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "logs_acesso_prontuario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "prontuario_versoes_prontuario_id_numero_key" ON "prontuario_versoes"("prontuario_id", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "anotacoes_pessoais_substitui_id_key" ON "anotacoes_pessoais"("substitui_id");

-- CreateIndex
CREATE INDEX "anotacoes_pessoais_profissional_id_paciente_id_idx" ON "anotacoes_pessoais"("profissional_id", "paciente_id");

-- CreateIndex
CREATE INDEX "vinculos_profissional_id_paciente_id_idx" ON "vinculos"("profissional_id", "paciente_id");

-- CreateIndex
CREATE INDEX "consentimentos_paciente_id_aceito_em_idx" ON "consentimentos"("paciente_id", "aceito_em");

-- CreateIndex
CREATE INDEX "logs_acesso_prontuario_paciente_id_ocorrido_em_idx" ON "logs_acesso_prontuario"("paciente_id", "ocorrido_em");

-- CreateIndex
CREATE INDEX "logs_acesso_prontuario_usuario_id_ocorrido_em_idx" ON "logs_acesso_prontuario"("usuario_id", "ocorrido_em");

-- CreateIndex
CREATE INDEX "prontuarios_paciente_id_profissional_id_idx" ON "prontuarios"("paciente_id", "profissional_id");

-- AddForeignKey
ALTER TABLE "prontuario_versoes" ADD CONSTRAINT "prontuario_versoes_prontuario_id_fkey" FOREIGN KEY ("prontuario_id") REFERENCES "prontuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prontuario_versoes" ADD CONSTRAINT "prontuario_versoes_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "profissionais"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anotacoes_pessoais" ADD CONSTRAINT "anotacoes_pessoais_substitui_id_fkey" FOREIGN KEY ("substitui_id") REFERENCES "anotacoes_pessoais"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anotacoes_pessoais" ADD CONSTRAINT "anotacoes_pessoais_profissional_id_fkey" FOREIGN KEY ("profissional_id") REFERENCES "profissionais"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anotacoes_pessoais" ADD CONSTRAINT "anotacoes_pessoais_paciente_id_fkey" FOREIGN KEY ("paciente_id") REFERENCES "pacientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vinculos" ADD CONSTRAINT "vinculos_profissional_id_fkey" FOREIGN KEY ("profissional_id") REFERENCES "profissionais"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vinculos" ADD CONSTRAINT "vinculos_paciente_id_fkey" FOREIGN KEY ("paciente_id") REFERENCES "pacientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consentimentos" ADD CONSTRAINT "consentimentos_paciente_id_fkey" FOREIGN KEY ("paciente_id") REFERENCES "pacientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

