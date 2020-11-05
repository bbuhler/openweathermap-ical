FROM hayd/alpine-deno:1.5.0

WORKDIR /app

USER deno

ADD . .

RUN deno cache index.js

CMD ["run", "--allow-net", "index.js"]

EXPOSE 3001
