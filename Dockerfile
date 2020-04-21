FROM node:12

WORKDIR /app

COPY ./ ./

RUN npm ci

CMD ["node", "--experimental-modules", "index.mjs"]

EXPOSE 3001
