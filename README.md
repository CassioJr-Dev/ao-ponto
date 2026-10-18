# AO PONTO

API NestJS para listar cortes disponíveis e registrar pedidos do totem. A persistência usa **Prisma ORM** com PostgreSQL: o modelo declara unicidade do pedido por sessão e o pedido, seus itens e a senha são criados em uma única transação.

## Requisitos

- Node.js 20+
- Docker e Docker Compose

## Ambiente local

```bash
npm install
Copy-Item .env.example .env
docker compose up -d postgres
npx prisma migrate dev --name init
npm run start:dev
```

A API estará em `http://localhost:3000`. O comando `npx prisma db seed` cadastra cortes ilustrativos no banco local para facilitar a exploração. Configure credenciais próprias em `.env` fora do ambiente local; `.env` não deve ser versionado.

A documentação interativa Swagger fica em `http://localhost:3000/docs` e o documento OpenAPI JSON em `http://localhost:3000/docs-json`.

## Front-end do totem

O aplicativo React fica em `front-end/`. Configure `FRONTEND_URL=http://localhost:5173` no ambiente da API quando o front-end estiver em outra origem, e `VITE_API_URL=http://localhost:3000` em `front-end/.env` quando a API não estiver no endereço padrão.

```bash
cd front-end
npm install
npm run dev
```

O front-end consulta `GET /` para mostrar os cortes e envia os itens selecionados para `POST /pedidos`. A tela de confirmação só é exibida após a resposta bem-sucedida do backend.

## API

`GET /` lista somente cortes disponíveis, incluindo preço por kg.

`POST /cortes` cadastra um corte para popular o catálogo. O `id` e a data de cadastro são gerados pelo servidor; `disponivel` é opcional e assume `true` quando omitido.

```json
{
  "nome": "Alcatra",
  "imagemUrl": "https://example.com/imagens/alcatra.jpg",
  "precoKg": "59.90",
  "disponivel": true
}
```

O preço é enviado como string decimal para preservar as casas decimais. A rota retorna `201` com o corte persistido e `400` quando os campos não passam pela validação. Essa rota está disponível sem autenticação para facilitar o cadastro inicial de dados.

`POST /pedidos` recebe:

```json
{
  "sessaoId": "81fef0bf-943d-4fd8-8d74-2b2438155846",
  "itens": [
    {
      "corteId": "e7b58a06-6ed8-4636-9fb2-8fe12856f72d",
      "quantidade": 0.75,
      "unidadeMedida": "KG"
    }
  ]
}
```

O backend valida cortes e itens, calcula os valores, persiste pedido e senha na mesma transação e só então responde. O `sessaoId` funciona como chave de idempotência: a mesma solicitação recupera o pedido persistido; uma solicitação diferente na sessão retorna `409 Conflict`. O banco também possui uma restrição única em `Pedido.sessaoId` para proteger corridas concorrentes.

Respostas de validação usam `400`, corte inexistente/indisponível usa `404`, sessão com pedido diferente usa `409`, e registro bem-sucedido usa `201`. Preços e subtotais não são aceitos do cliente.

## Preço por unidade

`KG` é multiplicado diretamente pelo preço/kg e `GRAMA` é convertido para kg antes do cálculo. O documento de domínio não define peso ou tarifa para `PECA` e `FATIA`, apesar de exigir subtotal e preço/kg. Nesta versão, esses valores são tratados como quantidade equivalente em kg para permitir o registro e o cálculo no servidor. Para cobrança comercial correta por peça/fatia, é necessário definir peso médio por corte ou uma tabela de preços específica por unidade.

## Comandos úteis

```bash
npx prisma generate
npx prisma migrate dev
npx prisma db seed
npm run build
npm test -- --runInBand
npm run test:e2e -- --runInBand
```

O Compose mantém os dados em volume nomeado `postgres_data`; para desligar o serviço sem remover os dados, execute `docker compose down`.
