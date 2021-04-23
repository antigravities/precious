FROM node:current-alpine

RUN mkdir /precious

WORKDIR /precious
COPY . /precious/
RUN npm install

ENV PORT=3000
EXPOSE 3000

CMD [ "node", "index.js" ]
