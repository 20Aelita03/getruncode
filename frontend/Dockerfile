FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm cache clean --force && npm install --legacy-peer-deps
COPY . .

ENV BROWSER=none
ENV HOST=0.0.0.0

EXPOSE 3000

CMD ["npm", "start"]
