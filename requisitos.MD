Você é um engenheiro de software sênior especializado em desenvolvimento backend, arquitetura de sistemas, APIs REST, bancos de dados relacionais, testes automatizados e sistemas distribuídos.

Sua responsabilidade é desenvolver o AO PONTO, um sistema digital de registro e gerenciamento de pedidos para açougues, com o objetivo de reduzir filas, organizar o atendimento e diminuir o tempo de espera dos clientes.

Nesta primeira iteração, implemente exclusivamente o caso de uso US01 — Registrar pedido, seguindo rigorosamente os requisitos funcionais, os critérios de aceitação e os requisitos não funcionais definidos neste documento.

Priorize código limpo, arquitetura simples, segurança, consistência dos dados, testabilidade e facilidade de manutenção. Não implemente funcionalidades futuras sem necessidade para atender ao escopo atual.

2. Contexto do projeto

O AO PONTO será utilizado em um totem de autoatendimento instalado em um açougue.

O cliente deverá conseguir selecionar um ou mais cortes de carne, informar as quantidades desejadas e confirmar seu pedido. Após o registro bem-sucedido, o sistema deverá gerar e exibir uma senha de atendimento.

O sistema deverá garantir que a senha somente seja exibida depois que o pedido estiver persistido no banco de dados.

Caso ocorra uma falha de conexão durante o registro, o sistema deverá permitir a recuperação e a sincronização do pedido sem gerar duplicidades.

Objetivo principal: reduzir o tempo de espera dos clientes por meio do registro digital, rápido e confiável de pedidos.

3. Escopo da primeira iteração:
Regras de Negocio:
RN-001 — Unicidade de pedido por sessão
Descrição: Cada sessão de uso do totem deve gerar no máximo um pedido confirmado. O sistema não permite que um mesmo conjunto de seleções seja submetido mais de uma vez na mesma sessão.
Fonte/autoridade: Documento de Visão AO PONTO, requisito não funcional "O sistema deve garantir que cada pedido seja registrado apenas uma vez."
Impacto: US01 — Registrar pedido.

RN-004 — Confirmação de gravação antes da emissão de senha
Descrição: A senha de atendimento só é gerada e exibida ao cliente após a confirmação de gravação do pedido no banco de dados. Pedidos não persistidos não geram senha.
Fonte/autoridade: Documento de Visão AO PONTO, requisito não funcional "Cada pedido deve ser armazenado no banco de dados com confirmação de gravação antes da geração da senha."
Impacto: US01 — Registrar pedido.

RN-006 — Composição mínima do pedido
Descrição: Um pedido só pode ser confirmado se contiver ao menos um corte selecionado com quantidade informada. O sistema não permite a finalização de pedidos sem itens ou com quantidade igual a zero em todos os cortes selecionados.
Impacto: US01 — Registrar pedido;

RN-007 — Unidade de medida por corte
Descrição: Para cada corte selecionado, o cliente deve informar a quantidade e escolher a unidade de medida entre as opções disponíveis: peça, pedaço, fatia ou gramas. Ambas as informações são obrigatórias para que o item seja incluído no pedido.
Impacto: US01 — Registrar pedido;

CRITÉRIO DE ACEITAÇÃO:
1.Pedido confirmado gera senha, com gravação no BD
antes da exibição.

2.No máximo um pedido confirmado por sessão do totem.


3.Senha só é exibida após gravação durável do pedido
(IndexedDB ou PostgreSQL).


4.Pedido sem item ou com quantidade zero é bloqueado.


5.Corte selecionado exige quantidade e unidade de
medida.


6.Registro do pedido em até 2 segundos para 95% das
operações


TESTE / MÉTODO DE VERIFICAÇÃO:

1.Teste funcional ponta a ponta:
- Montar pedido, confirmar, verificar senha exibida.

2.Tentar confirmar duas vezes a mesma sessão (reenvio manual).

3.Interromper a gravação (falha simulada) antes da confirmação e verificar que nenhuma senha é
exibida.

4.Tentar confirmar pedido vazio e com quantidade zero.

5.Tentar confirmar item sem unidade de medida informada.

6.Teste de desempeho cronometrado, amostra de no mínimo 30 registros.

EVIDÊNCIA EXIGIDA:

1.Registro do pedido no banco de dados correspondente
à senha exibida na execução do teste.

2.Consulta ao banco de dados mostrando um único
registro para o sessaoId testado.

3.Log de erro sem emissão de senha correspondente.

4.Mensagem de erro exibida na interface, sem pedido
criado.

5.Mensagem de erro exibida, item não incluído no
pedido.

6.Log com os tempos medidos de cada execução.

CONDIÇÃO DE CONCLUSÃO:

1.Senha exibida corresponde a um
pedido persistido, em 100% das
execuções.

2.Nenhuma duplicidade em 100% das
tentativas.

3.Nenhuma senha emitida sem gravação
correspondente, em 100% das
execuções.

4.Bloqueio em 100% das tentativas
inválidas.

5.Bloqueio em 100% das tentativas sem
unidade informada.

6.95% das execuções da amostra dentro
do limite de 2 segundos.


Arquitetura do projeto
rota get/ para listar os cortes, e rota para registrar o pedido
O projeto é em NestJs, o banco de dados voce devera criar um docker-compose para subir o servidor postgres, estrutura do projeto use o nativo do Nest que é service, model, controller, mas adicione uma camada repository que se comunica com o banco de dados, use coisas nativas do Nest como por exemplo as exceptions para tratamento de erros, validação dos dados na borda que no caso sera no controller com class validator em um DTO

1. Corte
- id: uuid
- nome: string
- imagemUrl: string
- precoKg: decimal
- disponivel: boolean
- dataCadastro: dateTime
2. SessaoTotem
- id: uuid
- dataInicio: dateTime
- dataFim: dateTime
- pedidoConfirmado: boolean
3. ItemPedido
- id: uuid
- quantidade: decimal
- unidadeMedida: UnidadeMedida
- presencial: boolean
- precoUnitarioKg: decimal
- subtotal: decimal
4. UnidadeMedida (Enum)
- KG
- GRAMA
- PECA
- FATIA
5. Pedido
- id: uuid
- numeroPedido: integer
- itensPedido: array
- status: StatusPedido
- presencial: boolean
- dataCriacao: dateTime
- dataConclusao: dateTime
6. StatusPedido (Enum)
- REGISTRADO
- EM_PREPARO
- CONCLUIDO
7. SenhaAtendimento
- id: uuid
- numeroSequencial: integer
- status: StatusSenha
- quantidadeChamadas: integer
- numeroReemissoes: integer
- ultimaChamada: dateTime
- dataGeracao: dateTime
8. Classe StatusSenha (Enum)
- PENDENTE
- CHAMADA
- FINALIZADA
- EXPIRADA