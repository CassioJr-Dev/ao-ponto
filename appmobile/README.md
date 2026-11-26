# AoPonto Mobile

App mobile em React Native com Expo, consumindo a API NestJS já existente. As telas foram adaptadas do front-end web: catálogo e carrinho, confirmação de senha, atendimento, painel e gerenciamento de cortes.

## Rodar

1. Instale o Node.js 20.19 ou superior.
2. Copie `.env.example` para `.env` e ajuste as URLs para o ambiente.
3. Execute `npm install` e `npm start` nesta pasta.
4. Abra o projeto com Expo Go ou emulador.

No emulador Android, a URL da API padrão é `http://10.0.2.2:3000`. Em um aparelho físico, defina `EXPO_PUBLIC_API_URL` com o IP local do computador que executa a API, por exemplo `http://192.168.1.10:3000`. Use a mesma máquina na `EXPO_PUBLIC_ASSETS_URL`, na porta `5173`, para exibir as imagens hospedadas no front-end. Imagens com URL absoluta continuam usando sua própria origem.

Configure o PostgreSQL e inicie a API conforme o README da raiz. Atendimento e painel usam os endpoints locais da API e precisam estar na mesma rede.

## Telas e API

- **Catálogo:** `GET /`, busca e filtros por categoria.
- **Carrinho/confirmação:** reserva de senhas em `POST /pedidos/reservas-senhas` e gravação idempotente em `POST /pedidos/sincronizar`. A fila local fica no AsyncStorage e tenta sincronizar novamente a cada 15 segundos.
- **Atendimento:** fila e ações em `/atendimento/*`, atualizada a cada 3 segundos.
- **Painel:** senha atual e últimas chamadas em `/atendimento/painel`, atualizadas a cada 3 segundos.
- **Gerenciar cortes:** CRUD em `/painel/cortes`.

O tema usa a paleta AoPonto (vermelho `#bd1018`, fundo claro e cartões brancos) e navegação por abas, adequada a telas estreitas.
