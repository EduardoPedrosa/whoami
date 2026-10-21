# Quem sou eu?

**Todo mundo sabe. Menos você.** Um jogo de “Quem sou eu?” para 2 a 12 amigos, em salas privadas. Cada pessoa escolhe a identidade de outra; perguntas de sim ou não revelam o segredo. Joguem pessoalmente ou em uma chamada de voz.

## O que mudou na versão 2

- Frontend inteiramente em **TypeScript + React 19 + Vite 8**, **Tailwind 4**, componentes **shadcn/ui/Radix** e Motion. Fontes locais, arte própria, avatares, navegação por teclado, movimento reduzido e layouts para celular.
- Backend **NestJS 12 + Socket.IO 4**, com regras e validação no servidor. Tipos, schemas Zod e dados de categorias compartilhados entre os dois projetos.
- Salas por código/link, anfitrião, prontidão, categorias, cronômetro opcional, turnos, confirmação de acerto por outra pessoa, resultados e pontos acumulados entre rodadas.
- Reconexão com sessão estável, snapshot completo, ACK com reenvio seguro e controle de versão/turno. O lugar fica reservado por 2 minutos. Recarregar não troca sua identidade.
- Estado salvo em **SQLite**, com WAL e transações. Salas e sessões sobrevivem ao reinício do backend se o arquivo/volume for preservado.

## Rodar em desenvolvimento

Requisitos: **Node 22.18+** (ou 24.11+) e **Yarn Classic 1.22.19**. A instalação usa um único lockfile na raiz.

```bash
nvm use
npm install --global yarn@1.22.19 # se necessário
yarn install --frozen-lockfile
cp frontend/.env.example frontend/.env.local
cp backend/.env.example backend/.env
yarn dev
```

Abra **http://localhost:3000**. Para simular duas pessoas na mesma máquina, use dois perfis ou uma janela anônima: a mesma sessão aberta em outra aba assume o lugar da anterior.

Para usar celulares na mesma rede, abra `http://IP-DA-MAQUINA:3000` e adicione essa origem a `CORS_ORIGIN` no `backend/.env`. Exemplo: `CORS_ORIGIN=http://localhost:3000,http://192.168.1.10:3000`. Reinicie o backend após editar. A sessão usa IDs criptográficos também nesse cenário de teste HTTP; no ambiente público, use HTTPS.

## Comandos

| Comando na raiz                          | O que faz                                                                              |
| ---------------------------------------- | -------------------------------------------------------------------------------------- |
| `yarn dev`                               | Compila/observa os contratos e executa frontend e backend                              |
| `yarn build`                             | Compila contratos, backend e frontend                                                  |
| `yarn start`                             | Backend compilado e preview local do frontend                                          |
| `yarn dev:frontend` / `yarn dev:backend` | Executa apenas um serviço; compile os contratos antes com `yarn build:shared`          |
| `yarn lint`                              | ESLint para todo o código                                                              |
| `yarn typecheck`                         | Verificação de tipos dos contratos e aplicações                                        |
| `yarn test`                              | Regras do jogo e integração real via Socket.IO                                         |
| `yarn test:e2e`                          | Partida completa, recuperação de conexão, responsividade e acessibilidade no navegador |
| `yarn format` / `yarn format:check`      | Formata/verifica o padrão do repositório                                               |
| `yarn verify`                            | Lint, tipos, testes de backend e build                                                 |

Os testes de navegador usam o Chrome instalado no macOS. No CI usam Chromium: `yarn playwright install --with-deps chromium`. `yarn start` serve para conferir o build local; o deploy de produção usa o Nginx fornecido ou uma hospedagem estática equivalente.

## Estrutura

```text
frontend/
  src/components/          Componentes comuns e componentes shadcn/ui
  src/features/game/       Entrada, criação e acesso às salas
  src/features/room/       Espera, atribuição, partida e resultados
  src/lib/                 Cliente Socket.IO, sessão, estado e utilitários
backend/
  src/game/                Gateway NestJS, regras, estado e projeções privadas
  src/storage/             SQLite, transações, sessões e recibos de comandos
  test/                    Regras e integração com servidor real
packages/shared/           Contratos TypeScript, schemas Zod e categorias
e2e/                       Testes Playwright e axe-core
deploy/                    Dockerfiles e Nginx
```

## Variáveis de ambiente

| Variável          | Onde                  | Padrão                                                                        |
| ----------------- | --------------------- | ----------------------------------------------------------------------------- |
| `VITE_SOCKET_URL` | `frontend/.env.local` | Vazio: mesma origem da página                                                 |
| `PORT`            | Backend               | `3005`                                                                        |
| `CORS_ORIGIN`     | Backend               | `http://localhost:3000`; obrigatório em produção, lista separada por vírgulas |
| `DATABASE_PATH`   | Backend               | `./data/whoami.sqlite`, relativo ao diretório do processo                     |
| `NODE_ENV`        | Backend               | `development`                                                                 |

O Vite encaminha `/socket.io` e `/api` ao backend no desenvolvimento/preview. Se hospedar os serviços em domínios separados, configure `VITE_SOCKET_URL=https://api.seu-dominio` **antes do build** e autorize a origem do frontend no backend. Variáveis `VITE_*` são públicas; nunca coloque segredos nelas.

## Deploy com Docker

```bash
CORS_ORIGIN=https://jogo.seu-dominio.com docker compose up --build -d
```

O frontend estará na porta **8080** (ou `WEB_PORT`). O Nginx serve os arquivos e encaminha HTTP/WebSocket ao backend; o backend não expõe porta pública no Compose. Configure seu proxy de borda/domínio com HTTPS. Para um teste local: `docker compose up --build -d` e abra http://localhost:8080.

O volume `game-data` mantém o SQLite. Faça backups consistentes com a API `backup` do SQLite ou pare o backend durante a cópia. `docker compose down` preserva o volume; remover o volume apaga as partidas. Para detalhes de operação, veja [docs/operations.md](docs/operations.md).

## Como a partida funciona

1. Crie a sala e compartilhe o convite. Escolha a categoria e o tempo de cada turno.
2. Todos marcam **Estou pronto**; o anfitrião inicia a rodada.
3. Cada pessoa escolhe quem o próximo jogador será. O jogo começa quando todos enviam.
4. Na sua vez, faça perguntas de sim ou não em voz alta. Continue até acertar, passar ou acabar o tempo.
5. Quando disser a identidade certa, outra pessoa confirma o acerto. Sua carta aparece e você ganha 1 ponto.
6. Quando todos os participantes restantes acertam, a rodada termina. O anfitrião pode organizar outra, mantendo os pontos.

A aplicação não transmite áudio/vídeo. Uma desconexão temporária mantém o lugar por 2 minutos; depois disso o participante é removido e o anfitrião é transferido se necessário. Se alguém sai durante a escolha de identidades, a mesa volta à espera para reorganizar as cartas.

## Documentação e próximos passos

- [Arquitetura, regras e garantias da conexão](docs/architecture.md)
- [Operação, limites e publicação](docs/operations.md)
- [Auditoria e direção visual](docs/reviews/2026-10-21-audit.md)
- [Evolução sugerida do produto](docs/roadmap.md)

O armazenamento e as transações foram projetados para **uma instância de backend**. Escalar para múltiplas réplicas exige coordenação de estado/locks e um adapter Socket.IO compatível com recuperação; não basta compartilhar o arquivo SQLite. Os testes cobrem os cenários documentados, sem prometer ausência absoluta de falhas de rede ou infraestrutura.
