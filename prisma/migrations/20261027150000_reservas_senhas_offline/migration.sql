-- CreateTable
CREATE TABLE "ReservaSenha" (
    "id" UUID NOT NULL,
    "totemId" UUID NOT NULL,
    "numeroInicio" INTEGER NOT NULL,
    "numeroFim" INTEGER NOT NULL,
    "catalogo" JSONB NOT NULL,
    "dataReserva" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReservaSenha_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "SenhaAtendimento" ADD COLUMN "reservaSenhaId" UUID;

-- CreateIndex
CREATE INDEX "ReservaSenha_totemId_numeroInicio_idx" ON "ReservaSenha"("totemId", "numeroInicio");

-- AddForeignKey
ALTER TABLE "SenhaAtendimento" ADD CONSTRAINT "SenhaAtendimento_reservaSenhaId_fkey" FOREIGN KEY ("reservaSenhaId") REFERENCES "ReservaSenha"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
