# Validação da versão 2

Executada em 21/10/2026, macOS/Apple Silicon com Node 22.21.1 e Chrome. O empacotamento de produção foi compilado e executado em Linux ARM64 pelo Docker/Colima.

| Verificação                                 | Resultado                                                                                     |
| ------------------------------------------- | --------------------------------------------------------------------------------------------- |
| ESLint                                      | Sem erros ou avisos de lint                                                                   |
| TypeScript                                  | Frontend, backend, contratos, testes e configuração sem erros                                 |
| Prettier                                    | Padrão consistente em todos os arquivos cobertos                                              |
| Build local                                 | Contratos ESM/CJS, NestJS e Vite compilados                                                   |
| Vitest                                      | 18 testes de regras, persistência e integração reais passaram                                 |
| Playwright em produção Docker               | 5 testes passaram sobre Nginx + NestJS                                                        |
| Acessibilidade axe-core                     | Sem violações nas telas cobertas: entrada, ajuda, espera, atribuição, partida e resultado     |
| Responsividade                              | 320, 375, 390, 768, 812, 1024 e 1440px; verificações de overflow e capturas                   |
| WebSocket bloqueado                         | Entrada e comando de prontidão funcionam por polling                                          |
| Rede offline e refresh                      | Retorno à mesma partida e identidade, sem revelar a própria carta                             |
| Reinício real do container                  | Dois clientes reconectaram à sala persistida com os mesmos IDs e segredo preservado           |
| UUID indisponível em contexto de rede local | Criação e comandos com fallback criptográfico passaram                                        |
| Auditoria das dependências de produção      | 213 dependências avaliadas, zero vulnerabilidades conhecidas no momento da consulta           |
| Docker                                      | Imagens de frontend/backend compiladas, healthcheck saudável, proxy HTTP/WebSocket verificado |

A auditoria não prevê vulnerabilidades futuras. Os testes não representam teste de carga ou cobertura automática de Safari/iOS/Firefox. O limite de salas é defensivo e não uma capacidade medida. A topologia entregue usa uma instância autoritativa com volume persistente.

## Antes e depois

![Interface anterior](../assets/before-desktop.png)

![Nova entrada desktop](../assets/after-desktop.png)

## Partida

![Partida desktop](../assets/playing-desktop.png)

![Partida no celular](../assets/playing-mobile.png)

## Resultado

![Resultado da rodada](../assets/results-desktop.png)
