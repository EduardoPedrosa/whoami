# Evolução do Whoami

## Entregue nesta etapa

- Base moderna e tipada, com responsabilidades separadas e contratos compartilhados.
- Salas privadas, convite simples e fluxo orientado por etapas.
- Regra social preservada: escolher a identidade de outra pessoa e descobrir a própria por perguntas.
- Estados de conexão, sessão recuperável, persistência e confirmação segura das ações.
- Interface com personalidade, uso no celular, teclado, redução de movimento e checagens automatizadas de acessibilidade.
- Testes das regras, transporte e jornada real, CI e execução com Docker.

## Próximas melhorias de produto, por prioridade

| Prioridade | Melhoria                                         | Por que fazer / critério para avançar                                                                                                                 |
| ---------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1          | Playtest com 4–8 pessoas e celulares reais       | Medir tempo para entrar, entendimento da atribuição, clareza dos turnos e erros de confirmação. Ajustar com observação, antes de adicionar mecânicas. |
| 1          | Testar Safari/iOS, Firefox e redes móveis        | Aumentar cobertura de suspensão de aba, retorno do app e combinações de transporte.                                                                   |
| 1          | Publicação com monitoramento e backup verificado | Confirmar domínio, uptime, restauração e recuperação em infraestrutura real.                                                                          |
| 2          | Sons sutis opcionais e acessíveis                | Feedback de início da vez e acerto, ativado pelo usuário, com controle de volume. Não depender do som para transmitir estado.                         |
| 2          | Variações de jogo e baralhos curados             | Modo cooperativo, desafio por categorias e sugestões por faixa etária; testar clareza e diversão sem aumentar o onboarding.                           |
| 2          | Histórico curto de perguntas/respostas           | Útil para grupos que jogam por texto. Só adicionar junto de limites, moderação, privacidade e política de retenção.                                   |
| 3          | Observabilidade externa                          | Telemetria sem apelidos/tokens: falhas de reconexão, duração de sessão, latência e erros. Escolher serviço e consentimento antes de coletar dados.    |
| 3          | Multirréplica                                    | Ownership de salas ou Postgres/Redis com coordenação e adapter compatível, quando teste de carga ou disponibilidade exigir.                           |
| 3          | Modo instalável/PWA                              | Facilitar abertura e retorno. O multiplayer continua precisando de rede; evitar service worker que sirva contratos antigos junto a servidor novo.     |

## Decisões que evitam complexidade prematura

O jogo funciona com apelido e convite, sem contas, login social ou cadastro. Não inclui ranking público, compras ou monetização. Áudio/vídeo permanece na chamada escolhida pelo grupo. Uma engine 3D em tempo real não melhora o loop principal deste jogo de perguntas; a arte pré-renderizada mantém personalidade com custo pequeno no celular.
