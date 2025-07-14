FROM node:18

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./
COPY .env.docker ./
COPY jest.config.js ./

COPY src ./src

RUN npm ci --omit=dev

RUN npm run build

RUN npm run start
