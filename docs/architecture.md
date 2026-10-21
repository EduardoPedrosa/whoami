# Arquitetura do Whoami

## Fluxo do jogo

1. O navegador abre uma conexão Socket.IO e recebe `me` com o ID da conexão.
2. `FirstPage` envia `enter` com o nome. O servidor adiciona o jogador à lista global e publica `users` individualmente para cada participante.
3. A interface passa de `FIRST_PAGE` para `WAITING`. `ShowUsers` desenha os participantes em círculo e as setas indicam quem escolhe a identidade de quem.
4. `Playing` envia `setLabel`. O servidor atribui a identidade ao próximo participante na ordem de entrada, com retorno ao primeiro ao chegar ao fim.
5. O servidor copia a lista para cada destinatário e substitui sua própria identidade por `hidden`. A identidade real do destinatário não é enviada para seu socket.
6. `start` exige pelo menos dois jogadores e todas as identidades preenchidas. O servidor muda de `WAITING` para `STARTED` e emite `started`; o frontend passa a `PLAYING`.
7. `restart` apaga todas as identidades, republica a lista e emite `restarted`.
8. A desconexão remove o participante. Quando a lista fica vazia, o servidor retorna a `WAITING`.

## Mapa de arquivos

| Arquivo | Responsabilidade |
| --- | --- |
| `frontend/src/pages/index.js` | Conexão, listeners, estado da tela, jogadores e erros |
| `frontend/src/pages/_app.js` | CSS baseline, título e limpeza do CSS JSS servido pelo servidor |
| `frontend/src/pages/_document.js` | HTML em português e coleta dos estilos Material UI para SSR |
| `frontend/src/components/FirstPage/index.js` | Entrada do nome e envio de `enter` |
| `frontend/src/components/Playing/index.js` | Escolha da identidade seguinte, início e reinício |
| `frontend/src/components/Playing/ShowUsers.js` | Disposição circular e setas via react-xarrows |
| `frontend/src/components/UI/Alert.js` | Snackbar para erros enviados pelo backend |
| `frontend/src/utils/states.js` | Estados da interface: FIRST_PAGE, WAITING e PLAYING |
| `backend/src/index.js` | Servidor HTTP/Socket.IO, lista global e handlers do jogo |
| `backend/src/utils/getNextUserIndex.js` | Seleção circular do próximo jogador |
| `backend/src/utils/sendToAllAndHideOwnLabel.js` | Emissão individual com a identidade própria oculta |
| `backend/src/utils/states.js` | Estados exportados do servidor: WAITING e STARTED |
| `backend/test/game.test.js` | Partida real automatizada, CORS e regressão de desconexão |

## Protocolo Socket.IO

| Direção | Evento | Dados / efeito |
| --- | --- | --- |
| Servidor → cliente | `me` | ID do socket |
| Cliente → servidor | `enter` | Nome como string; entrada na partida em espera |
| Servidor → cliente | `users` | Array de `{ id, name, label }`, com identidade própria oculta |
| Cliente → servidor | `setLabel` | String com a identidade do próximo jogador |
| Cliente → servidor | `start` | Sem payload; valida jogadores e identidades |
| Servidor → clientes | `started` | Partida iniciada |
| Cliente → servidor | `restart` | Sem payload; limpa as identidades |
| Servidor → clientes | `restarted` | Retorno à espera |
| Servidor → cliente | `error` | Mensagem de erro do jogo como string |

Não há endpoints REST, banco de dados, autenticação, cadastro, placar ou resolução automática dos palpites. O servidor HTTP existe para o transporte do Socket.IO.

## Limitações atuais

- Há apenas uma partida global por processo; não existem salas nem isolamento de grupos.
- Todos os dados são perdidos ao reiniciar o processo. Múltiplas instâncias não compartilham estado.
- Falta validação robusta dos payloads, limite de tamanho, proteção contra entradas duplicadas e verificação de participação em todos os comandos. Um cliente conectado pode tentar iniciar/reiniciar a partida; isto requer endurecimento antes de uso público amplo.
- A reconexão gera outro ID e não restaura a participação anterior automaticamente.
- A saída de jogadores durante a partida não recalcula identidades nem encerra a rodada automaticamente, exceto quando todos saem.
- A string `hidden` é um marcador de protocolo e pode conflitar com uma identidade escolhida literalmente com esse texto.
- Next 11, React 17 e Material UI 4 são versões legadas. A migração manteve as versões e não constitui uma atualização de segurança das dependências.
- O lint herdado aponta uma dependência ausente de `useEffect` em `ShowUsers`; esse componente merece revisão na modernização da interface.

## Migração

Base do frontend: `4f8681026f190060055e002bfb6cffc704fab22b`.
Base do backend: `487faf8b2e7eab2f28480a9f926eb51059dc0223`.

O frontend foi movido para `frontend/`. O histórico completo do backend foi unido por merge de históricos independentes e sua árvore incorporada em `backend/`. Os commits originais continuam ancestrais da branch principal; nenhum submódulo ou segundo repositório é necessário para executar o projeto.

A configuração foi consolidada em Yarn Workspaces com lockfile único. A URL fixa do Heroku foi substituída por variável de ambiente. Durante a validação foram corrigidos a ausência de export dos estados do backend, a remoção indevida de jogador quando um visitante desconecta, o reset da partida vazia e o listener de jogadores que capturava o estado inicial da tela.
