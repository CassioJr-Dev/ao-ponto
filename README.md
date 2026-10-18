# AO PONTO

Aplicação de registro de pedidos para açougue, com API NestJS, PostgreSQL e front-end React.

## Requisitos

- Node.js 20 ou superior
- Docker Desktop com Docker Compose

## Preparação local

Na raiz do projeto, abra um terminal PowerShell e configure o ambiente e o banco:

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
npm install
docker compose up -d postgres
npx prisma migrate dev
npx prisma db seed
```

O arquivo `.env.example` contém as configurações locais de conexão. O comando de seed cadastra Alcatra e Costela bovina e pode ser executado novamente para atualizar os caminhos das imagens.

No segundo terminal, instale as dependências do front-end:

```powershell
cd front-end
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
npm install
```

## Iniciar a aplicação

No primeiro terminal, na raiz do projeto, inicie a API:

```powershell
npm run start:dev
```

No segundo terminal, dentro de `front-end`, inicie o Vite:

```powershell
npm run dev
```

- Front-end: http://localhost:5173
- API: http://localhost:3000
- Swagger: http://localhost:3000/docs

O front-end busca os cortes em `GET /` e registra pedidos em `POST /pedidos`. A tela da senha aparece após a API confirmar o pedido.

Para parar o PostgreSQL sem remover os dados locais, execute `docker compose down` na raiz do projeto.

## Testes e critérios de aceitação

Os testes abaixo foram executados localmente:

```powershell
npm test -- --runInBand
npm run test:e2e -- --runInBand
```

**Resultado da execução:** 3 testes unitários aprovados e 10 testes e2e aprovados.

Os testes e2e verificam:

- Persistência do pedido e da senha antes da resposta da API.
- Idempotência e unicidade por sessão, inclusive em chamadas concorrentes.
- Rollback do pedido quando ocorre uma falha simulada ao gravar a senha.
- Rejeição de pedido vazio, quantidade zero ou negativa e unidade ausente ou inválida.
- Aceitação das unidades suportadas e conversão de gramas para quilogramas.
- Medição de 30 registros: na execução local, o p95 foi de **17,9 ms**, abaixo do limite de 2 segundos.

O teste e2e requer o PostgreSQL iniciado e usa a conexão definida em `.env`. A medição de desempenho é uma amostra local; os tempos podem variar conforme a máquina e o ambiente.
