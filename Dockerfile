FROM node:lts-bullseye

RUN mkdir /home/node/bikepacker
COPY ./bikepacker/package.json /home/node/bikepacker

WORKDIR /home/node/bikepacker
RUN npm install

COPY ./bikepacker /home/node/bikepacker

CMD node /home/node/bikepacker/src/index.js