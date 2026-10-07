# Shared image for the Node services. Build with --build-arg APP=issuer|verifier|telegram-bot
FROM node:22-bookworm-slim
ARG APP
ENV APP=${APP}
RUN corepack enable
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile --filter "@zpass/${APP}..."
USER node
CMD ["sh", "-c", "pnpm --filter @zpass/${APP} start"]
