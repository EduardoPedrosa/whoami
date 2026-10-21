# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS dependencies
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package.json yarn.lock tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY frontend/package.json frontend/package.json
COPY backend/package.json backend/package.json
RUN --mount=type=cache,id=whoami-yarn,target=/usr/local/share/.cache/yarn,sharing=locked yarn install --frozen-lockfile --non-interactive

FROM dependencies AS build
COPY packages/shared packages/shared
COPY backend backend
COPY frontend frontend
RUN yarn build

FROM build AS production-dependencies
RUN --mount=type=cache,id=whoami-yarn,target=/usr/local/share/.cache/yarn,sharing=locked yarn install --production --frozen-lockfile --non-interactive --ignore-scripts

FROM node:22-bookworm-slim AS backend
ENV NODE_ENV=production PORT=3005 DATABASE_PATH=/data/whoami.sqlite
WORKDIR /app
COPY --from=production-dependencies /app/package.json /app/yarn.lock ./
COPY --from=production-dependencies /app/node_modules ./node_modules
COPY --from=build /app/packages/shared ./packages/shared
COPY --from=build /app/backend/package.json ./backend/package.json
COPY --from=build /app/backend/dist ./backend/dist
RUN mkdir -p /data && chown node:node /data
USER node
EXPOSE 3005
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD node -e "fetch('http://127.0.0.1:3005/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "backend/dist/main.js"]

FROM nginx:stable-alpine AS frontend
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/dist /usr/share/nginx/html
EXPOSE 80
