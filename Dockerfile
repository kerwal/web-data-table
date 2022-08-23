FROM node

ADD . ./

RUN npm install

WORKDIR ./example

CMD node app.js