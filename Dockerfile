FROM swr.cn-north-4.myhuaweicloud.com/shiyuehehu/nodejs-gyp:latest

WORKDIR /app

COPY package.json /app

RUN npm i --registry https://registry.npm.taobao.org && npm cache clean --force

COPY . /app

CMD node /app/app/getData.js
