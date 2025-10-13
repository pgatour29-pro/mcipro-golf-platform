FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm i
COPY . .
EXPOSE 4100
CMD ["npm","run","start"]
