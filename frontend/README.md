# Frontend Whoami

React, TypeScript, Vite, Tailwind e componentes shadcn/ui sobre Radix. A instalação é feita na raiz do monorepo.

- `yarn dev:frontend`: desenvolvimento na porta 3000, com proxy para o backend na porta 3005.
- `yarn workspace @whoami/frontend build`: checagem de tipos e build estático em `frontend/dist`.
- `yarn start:frontend`: preview local do build.

A configuração, as regras e o deploy estão no [README principal](../README.md). O cliente da conexão está em `src/lib/game-client.ts`; as telas estão separadas por etapa em `src/features/room`.
