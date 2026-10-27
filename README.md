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

O Vite também fica acessível pela rede local. Para abrir as telas em outro dispositivo, use o IP local do computador que está executando o projeto no lugar de `localhost` (por exemplo, `http://192.168.1.10:5173`). O endereço padrão da API acompanha o host usado no navegador; se `VITE_API_URL` estiver definido no `.env` do front-end, ajuste-o para `http://<IP-local-do-computador>:3000`.

- Front-end: http://localhost:5173
- API: http://localhost:3000
- Swagger: http://localhost:3000/docs
- Tela de atendimento: http://localhost:5173/atendimento
- Painel de senhas: http://localhost:5173/painel
- Cadastro de cortes: http://localhost:5173/cortes/novo

O totem baixa os cortes e a reserva de senhas enquanto está conectado; pedidos novos são gravados localmente e sincronizados pela API. `POST /pedidos` continua disponível para clientes legados.

## Operação offline do totem

Ao iniciar conectado, o totem reserva um bloco de 50 números e guarda no IndexedDB o intervalo e uma cópia do catálogo com os preços. O navegador persiste cada pedido localmente antes de mostrar a senha. Sem conexão, usa a próxima senha do bloco e mantém o pedido na fila local. Ao voltar a conexão, o app reenvia a fila em ordem; a API valida o número reservado e a sessão idempotente antes de salvar o pedido no banco. O pedido aparece na fila de atendimento depois dessa sincronização.

O tamanho pode ser ajustado por `OFFLINE_TICKET_BLOCK_SIZE` no ambiente da API. Os blocos não utilizados deixam lacunas na numeração, pois seus números ficam reservados para aquele totem. Se os números locais acabarem sem conexão, o app interrompe novos pedidos até conseguir reservar outro bloco. Os dados locais ficam no armazenamento do navegador; limpar os dados do site remove a cópia ainda não sincronizada.

O cache para reabrir o app sem rede é instalado pelo service worker no build de produção. `localhost` é considerado contexto seguro pelo navegador. Para usar o totem por IP em outro dispositivo, sirva o front-end com HTTPS para que o navegador permita o uso offline.

Rotas novas da API:

- `POST /pedidos/reservas-senhas` — reserva idempotentemente um bloco para o totem.
- `POST /pedidos/sincronizar` — confirma um pedido local usando a senha e o catálogo reservados.

Na tela de atendimento, pedidos pendentes são agrupados pela maior quantidade de pedidos que contém cada corte; em caso de empate, os mais antigos aparecem primeiro. O atendente chama a próxima senha manualmente, pode reemitir a chamada atual e conclui o pedido em atendimento. Concluir um pedido não chama o próximo; o atendente deve acionar essa chamada manualmente. A tela de atendimento e o painel atualizam os dados a cada 3 segundos. O endpoint de dados do painel aceita somente conexões da rede local.

As operações também estão disponíveis na API. As rotas de atendimento aceitam somente conexões da rede local:

- `GET /atendimento/fila`
- `GET /atendimento/painel`
- `POST /atendimento/chamar-proxima`
- `POST /atendimento/pedidos/:pedidoId/rechamar`
- `PATCH /atendimento/pedidos/:pedidoId/concluir`

Para parar o PostgreSQL sem remover os dados locais, execute `docker compose down` na raiz do projeto.

## Testes e critérios de aceitação

Os testes abaixo foram executados localmente:

```powershell
npm test -- --runInBand
npm run test:e2e -- --runInBand
```

**Validação recente:** 19 testes unitários e 14 testes e2e aprovados, incluindo reserva de senhas e sincronização idempotente com o preço do catálogo reservado.

Os testes e2e verificam:

- Persistência do pedido e da senha antes da resposta da API.
- Idempotência e unicidade por sessão, inclusive em chamadas concorrentes.
- Rollback do pedido quando ocorre uma falha simulada ao gravar a senha.
- Rejeição de pedido vazio, quantidade zero ou negativa e unidade ausente ou inválida.
- Aceitação das unidades suportadas e conversão de gramas para quilogramas.
- Medição de 30 registros: na última execução completa local, o p95 foi de **37,3 ms**, abaixo do limite de 2 segundos.

O teste e2e requer o PostgreSQL iniciado e usa a conexão definida em `.env`. A medição de desempenho é uma amostra local; os tempos podem variar conforme a máquina e o ambiente.
