FROM node:8.1-alpine

MAINTAINER Eric Tousignant "eric@erictousignant.com"

# needs this to find the nodejs exec
RUN npm install ws

COPY ./app /root/app
COPY ./server /root/server

EXPOSE 8080 8888

ENTRYPOINT ["node", "/root/server/server.js"]