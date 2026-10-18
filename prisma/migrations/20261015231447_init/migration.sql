-- CreateEnum
CREATE TYPE "UnidadeMedida" AS ENUM ('KG', 'GRAMA', 'PECA', 'FATIA');

-- CreateEnum
CREATE TYPE "StatusPedido" AS ENUM ('REGISTRADO', 'EM_PREPARO', 'CONCLUIDO');

-- CreateEnum
CREATE TYPE "StatusSenha" AS ENUM ('PENDENTE', 'CHAMADA', 'FINALIZADA', 'EXPIRADA');

-- CreateTable
CREATE TABLE "Corte" (
    "id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "imagemUrl" TEXT NOT NULL,
    "precoKg" DECIMAL(12,2) NOT NULL,
    "disponivel" BOOLEAN NOT NULL DEFAULT true,
    "dataCadastro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Corte_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessaoTotem" (
    "id" UUID NOT NULL,
    "dataInicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataFim" TIMESTAMP(3),
    "pedidoConfirmado" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SessaoTotem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pedido" (
    "id" UUID NOT NULL,
    "numeroPedido" SERIAL NOT NULL,
    "sessaoId" UUID NOT NULL,
    "status" "StatusPedido" NOT NULL DEFAULT 'REGISTRADO',
    "presencial" BOOLEAN NOT NULL DEFAULT true,
    "total" DECIMAL(12,2) NOT NULL,
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataConclusao" TIMESTAMP(3),

    CONSTRAINT "Pedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemPedido" (
    "id" UUID NOT NULL,
    "pedidoId" UUID NOT NULL,
    "corteId" UUID NOT NULL,
    "quantidade" DECIMAL(12,3) NOT NULL,
    "unidadeMedida" "UnidadeMedida" NOT NULL,
    "presencial" BOOLEAN NOT NULL DEFAULT true,
    "precoUnitarioKg" DECIMAL(12,2) NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "ItemPedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SenhaAtendimento" (
    "id" UUID NOT NULL,
    "numeroSequencial" SERIAL NOT NULL,
    "pedidoId" UUID NOT NULL,
    "status" "StatusSenha" NOT NULL DEFAULT 'PENDENTE',
    "quantidadeChamadas" INTEGER NOT NULL DEFAULT 0,
    "numeroReemissoes" INTEGER NOT NULL DEFAULT 0,
    "ultimaChamada" TIMESTAMP(3),
    "dataGeracao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SenhaAtendimento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Pedido_numeroPedido_key" ON "Pedido"("numeroPedido");

-- CreateIndex
CREATE UNIQUE INDEX "Pedido_sessaoId_key" ON "Pedido"("sessaoId");

-- CreateIndex
CREATE INDEX "Pedido_dataCriacao_idx" ON "Pedido"("dataCriacao");

-- CreateIndex
CREATE UNIQUE INDEX "SenhaAtendimento_numeroSequencial_key" ON "SenhaAtendimento"("numeroSequencial");

-- CreateIndex
CREATE UNIQUE INDEX "SenhaAtendimento_pedidoId_key" ON "SenhaAtendimento"("pedidoId");

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_sessaoId_fkey" FOREIGN KEY ("sessaoId") REFERENCES "SessaoTotem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemPedido" ADD CONSTRAINT "ItemPedido_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemPedido" ADD CONSTRAINT "ItemPedido_corteId_fkey" FOREIGN KEY ("corteId") REFERENCES "Corte"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SenhaAtendimento" ADD CONSTRAINT "SenhaAtendimento_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE CASCADE ON UPDATE CASCADE;
