FROM node:18

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./
COPY knexfile.cjs ./
COPY .env.docker ./

RUN npm ci

COPY src ./src
COPY db ./db
COPY tests ./tests

RUN npm run build

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
