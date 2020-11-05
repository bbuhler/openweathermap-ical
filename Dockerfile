FROM node:14-slim

WORKDIR /app

COPY ./ ./

RUN npm ci

CMD ["node", "index.mjs"]

EXPOSE 3001
