FROM node:16.10.0 as BatBot
WORKDIR /app/bot
COPY ./ ./
RUN npm install
RUN npm run build
CMD ["npm", "start"]