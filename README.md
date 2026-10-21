# Whoami

Jogo multiplayer de “Quem sou eu?” em tempo real. Cada participante escolhe a identidade do próximo jogador; todos veem as identidades dos outros, mas a própria permanece oculta. As perguntas e os palpites acontecem entre os jogadores, fora da aplicação.

Repositório oficial: https://github.com/EduardoPedrosa/whoami.

## Estrutura

```text
frontend/  Next.js 11, React 17, Material UI 4 e Socket.IO Client
backend/   Servidor HTTP Node.js e Socket.IO 4; partida em memória
docs/      Arquitetura, protocolo e limitações conhecidas
```

Os dois projetos são Yarn Workspaces, com um único `yarn.lock` na raiz. O histórico original do `whoami-api` foi incorporado por merge, sem squash.

## Executar localmente

Requisitos: Node.js 22 e Yarn Classic 1.22.19 (`npm install --global yarn@1.22.19`, se necessário).

```bash
nvm use                       # se você usa nvm
cp frontend/.env.example frontend/.env.local
cp backend/.env.example backend/.env
yarn install --frozen-lockfile
yarn dev
```

Abra http://localhost:3000 em duas janelas, entre com nomes diferentes, atribua as identidades e clique em **Começar**. O backend usa http://localhost:3005. `Ctrl+C` encerra ambos os processos.

| Comando na raiz | Função |
| --- | --- |
| `yarn dev` | Frontend e backend com atualização automática |
| `yarn dev:frontend` / `yarn dev:backend` | Executar apenas uma aplicação |
| `yarn build` | Gerar build de produção do frontend |
| `yarn start` | Executar frontend compilado e backend |
| `yarn start:frontend` / `yarn start:backend` | Executar apenas um serviço de produção |
| `yarn lint` | ESLint do frontend e verificação de sintaxe do backend |
| `yarn test` | Teste de integração com servidor e clientes Socket.IO reais |

O frontend legado usa `--openssl-legacy-provider` apenas nos processos de desenvolvimento/build, pois o webpack incluído no Next 11 usa MD4. Isso permite executar com Node 22 sem alterar as versões principais nesta migração. A modernização do Next/React/Material UI permanece necessária antes de tratar a aplicação como uma base atualizada de produção.

## Configuração

| Variável | Serviço | Padrão | Momento de leitura |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SOCKET_URL` | Frontend | `http://localhost:3005` | Desenvolvimento/build do Next |
| `PORT` | Backend | `3005` | Inicialização |
| `CORS_ORIGIN` | Backend | `http://localhost:3000` | Inicialização |

`backend/.env` é carregado pelos comandos do workspace. O Next carrega `frontend/.env.local`. Não adicione segredos a variáveis `NEXT_PUBLIC_*`, pois elas são publicadas no navegador.

Para testar em outro dispositivo, use o IP da máquina no endereço do socket e ajuste `CORS_ORIGIN` para a origem exata do frontend. Mudar `NEXT_PUBLIC_SOCKET_URL` em produção exige novo build.

## Deploy do monorepo

Os serviços continuam sendo dois processos, embora compartilhem o repositório:

- **Frontend:** configure `frontend` como diretório raiz na Vercel, permita arquivos fora desse diretório para os workspaces, instale as dependências a partir da raiz do repositório e execute o script de build do frontend. Defina `NEXT_PUBLIC_SOCKET_URL` com a URL HTTPS do backend antes do build.
- **Backend:** use um host com processo Node persistente e suporte a Socket.IO/WebSocket. Na raiz do repositório, execute `yarn install --frozen-lockfile` e `yarn start:backend`. Configure `PORT` e `CORS_ORIGIN` com a origem HTTPS do frontend. Não use uma função serverless curta para hospedar esse servidor.
- Em um host único, `yarn build` e `yarn start` executam os dois serviços. Se a plataforma injeta `PORT`, use os comandos de cada serviço separadamente e passe a porta do frontend por `yarn workspace @whoami/frontend start -p 3000` para evitar conflitos.

A migração do código não altera automaticamente projetos de hospedagem existentes. Reaponte qualquer integração ligada ao antigo repositório para `EduardoPedrosa/whoami`, com os comandos e diretórios acima.

Veja [docs/architecture.md](docs/architecture.md) para o mapa completo do código, protocolo e limitações.
