FROM node:18

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./
COPY knexfile.cjs ./
COPY jest.config.js ./

RUN npm ci --omit=dev

COPY src ./src
COPY db ./db

RUN npm run build

EXPOSE 3001

CMD ["npm", "run", "start"]
