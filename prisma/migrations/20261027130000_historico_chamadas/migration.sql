-- CreateTable
CREATE TABLE "ChamadaSenha" (
    "id" UUID NOT NULL,
    "senhaId" UUID NOT NULL,
    "dataChamada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reemissao" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ChamadaSenha_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChamadaSenha_dataChamada_idx" ON "ChamadaSenha"("dataChamada");

-- AddForeignKey
ALTER TABLE "ChamadaSenha" ADD CONSTRAINT "ChamadaSenha_senhaId_fkey" FOREIGN KEY ("senhaId") REFERENCES "SenhaAtendimento"("id") ON DELETE CASCADE ON UPDATE CASCADE;
