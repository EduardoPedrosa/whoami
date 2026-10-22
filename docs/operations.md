# Operação e publicação

## Cloudflare e CapRover

A publicação usa frontend estático na Cloudflare e uma instância NestJS no CapRover, com HTTPS e WebSocket. O backend usa `STORAGE_MODE=memory`, sem banco nem volume. Durante a rodada, desconexões preservam os lugares e a ordem da roda enquanto a sala existir. Na espera e após o fim, a reserva dura dois minutos. Reinícios e atualizações encerram as salas abertas. O GitHub Actions compila, testa, publica a imagem e entrega ao CapRover sua referência imutável. Veja [configuração, variáveis e comandos de validação](cloudflare-caprover.md).

## Docker com persistência opcional

Comece com uma instância NestJS, um volume persistente e um proxy HTTPS. O Compose inclui Nginx para os arquivos estáticos e encaminha `/api` e `/socket.io` ao backend na rede interna. Apenas a porta do frontend é publicada.

```bash
CORS_ORIGIN=https://jogo.exemplo.com WEB_PORT=8080 docker compose up --build -d
docker compose ps
docker compose logs --tail 100 backend
```

Configure o proxy externo com WebSocket habilitado e timeouts superiores ao heartbeat. O Nginx incluído usa 75 segundos de timeout no proxy, sem buffering para Socket.IO. Autorize a origem pública exata em `CORS_ORIGIN`; várias origens podem ser separadas por vírgulas. Não use `*` em produção.

`GET /api/health` informa se a aplicação está respondendo. O container backend tem healthcheck. Um monitor externo deve acompanhar disponibilidade e reinícios. Os logs NestJS mostram inicialização e erros internos; mensagens ao usuário não incluem stack traces.

## Persistência e backups

O SQLite é armazenado em `/data/whoami.sqlite` no container, no volume `game-data`. Não hospede esse arquivo em um disco efêmero de função serverless. O backend necessita de processo persistente.

Faça backup diário, valide restauração e preserve um histórico de cópias. Não copie apenas o arquivo principal durante gravações em WAL: use a API de backup online do SQLite, ou pare o backend, copie o volume e reinicie. Proteja o volume, pois ele contém as identidades secretas da partida e os hashes de sessão.

Desligamentos normais encerram os sockets e fecham o banco na etapa final do ciclo NestJS. Reinícios restauram a sala e permitem que os clientes recuperem o lugar. Uma parada longa pode ultrapassar a janela de reconexão; o produto não promete recuperação ilimitada após abandono.

## Hospedagens separadas

O frontend pode ser publicado como arquivos estáticos (`frontend/dist`). Configure fallback para `index.html`, cache longo para assets com hash e revalidação do HTML. Defina `VITE_SOCKET_URL` com a URL do backend antes de gerar o build.

O backend usa `yarn build:shared && yarn workspace @whoami/backend build` no build e `yarn start:backend` na execução, a partir da raiz. Precisa das dependências de produção, do pacote compartilhado compilado e do volume SQLite. Configure `PORT`, `NODE_ENV=production` e `CORS_ORIGIN`.

## Escala

O modelo atual suporta um processo autoritativo. O limite configurado é de 250 salas e 12 jogadores por sala, um limite defensivo, não uma capacidade medida por teste de carga.

Para múltiplas réplicas, é necessário definir qual instância é dona de cada sala ou adotar armazenamento transacional compartilhado com coordenação. Instale então um adapter Socket.IO compatível com o modelo de recuperação escolhido e use afinidade quando polling exigir. Não compartilhe o SQLite via volume de rede como substituto dessa arquitetura.

Por trás de proxy, várias conexões podem aparecer com o mesmo IP para o backend. O limite atual permite 120 tentativas por minuto por endereço. Monitore reconexões e ajuste a política no gateway conforme a topologia. Os limites por sessão continuam independentes.

## Check de lançamento

1. Configurar domínio, HTTPS, origem permitida e volume.
2. Executar `yarn verify`, `yarn format:check` e `yarn test:e2e`.
3. Testar dois aparelhos reais, redes diferentes e retorno após trocar de aplicativo.
4. Confirmar backup/restauração e monitor externo.
5. Observar consumo de memória, latência e erros numa partida com o número de pessoas esperado.

A automação local e de CI reduz regressões. Ela não substitui teste de carga, cobertura de todos os navegadores nem observação em produção. Chromium é o navegador automatizado neste projeto; Safari/iOS e Firefox são a próxima ampliação da matriz.
