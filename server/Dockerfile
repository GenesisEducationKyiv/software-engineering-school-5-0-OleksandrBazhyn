FROM node:18

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./
COPY knexfile.cjs ./
COPY .env.docker ./
COPY jest.config.js ./

RUN npm ci --omit=dev

COPY src ./src
COPY db ./db

RUN npm run build

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
CMD ["npm", "run", "start"]
