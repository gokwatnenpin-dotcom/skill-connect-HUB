FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY web/package*.json web/
RUN npm install && npm install --prefix web
COPY . .
RUN npm run build
EXPOSE 5000
CMD ["npm", "start"]
