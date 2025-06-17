FROM node:18

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./
COPY knexfile.cjs ./
COPY .env.docker ./
COPY jest.config.js ./

RUN apt-get update && apt-get install -y netcat-openbsd

RUN npm ci

COPY src ./src
COPY db ./db
COPY tests ./tests

RUN npm run build

CMD ["npm", "run", "start"]