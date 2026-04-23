FROM node:lts-alpine

WORKDIR /src

COPY package.json pnpm-lock.yaml* ./

RUN corepack enable \
  && corepack prepare pnpm@latest --activate \
  && pnpm install --frozen-lockfile

COPY . .

RUN chmod +x docker-entrypoint.sh

RUN pnpm run build

EXPOSE 3001

CMD ["sh", "./docker-entrypoint.sh"]