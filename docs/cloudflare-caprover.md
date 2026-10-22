# Publicação: Cloudflare e CapRover

O frontend é servido pelo Worker `whoami`, como arquivos estáticos. O backend NestJS/Socket.IO roda no app `whoami-api` do CapRover, em uma única instância.

## Cloudflare

- Repositório: `EduardoPedrosa/whoami`, branch `main`.
- Root directory: vazio (raiz do monorepo).
- Build: `yarn build:shared && yarn workspace @whoami/frontend build`.
- Deploy: `npx wrangler deploy --config frontend/wrangler.jsonc`.
- Variáveis de build: `NODE_VERSION=22.21.1`, `YARN_VERSION=1.22.19`, `VITE_SOCKET_URL=https://whoami-api.eplabs.com.br`.
- URL: https://whoami.eduardopedrosa-dev.workers.dev

`VITE_SOCKET_URL` é pública e incorporada ao JavaScript. Alterar seu valor exige um novo build. O arquivo Wrangler configura o fallback de SPA para os links das salas.

## CapRover

- App: `whoami-api`, uma instância, sem volume e sem portas públicas adicionais.
- HTTPS obrigatório, suporte a WebSocket habilitado e porta HTTP do contêiner `3005`.
- Repositório: `github.com/EduardoPedrosa/whoami`, branch `main`.
- Captain definition: `./captain-definition`, com contexto na raiz do monorepo.
- Dockerfile: `deploy/Dockerfile.caprover`, que compila apenas contratos e backend.
- Healthcheck: https://whoami-api.eplabs.com.br/api/health

Variáveis de execução:

```dotenv
NODE_ENV=production
PORT=3005
STORAGE_MODE=memory
CORS_ORIGIN=https://whoami.eduardopedrosa-dev.workers.dev
```

O modo `memory` usa Maps em memória, sem banco ou arquivo de dados. Reenvios continuam idempotentes e as ações são atômicas. A reserva de lugar de dois minutos funciona enquanto o processo está ativo. Reiniciar, atualizar ou perder o processo encerra todas as salas. Nunca aumente a contagem de instâncias nesse modo.

O modo anterior continua disponível com `STORAGE_MODE=sqlite`, `DATABASE_PATH` apontando para um volume persistente. Sem `STORAGE_MODE`, o padrão legado continua sendo SQLite. O Dockerfile do CapRover define explicitamente `memory`.

Após cada deploy, confira saúde, criação e entrada em sala, reconexão e uma rodada entre duas sessões. O frontend já compilado não recebe mudanças de variável em tempo de execução.

## Referências

- [Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)
- [Worker Static Assets](https://developers.cloudflare.com/workers/static-assets/binding/)
- [Deploy por repositório no CapRover](https://caprover.com/docs/deployment-methods.html)
- [Captain definition e contexto Docker](https://caprover.com/docs/captain-definition-file.html)
