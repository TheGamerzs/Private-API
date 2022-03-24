FROM node:17.8-alpine3.15

WORKDIR /PreMiD/API

COPY . .

RUN yarn run init
RUN npm prune --production

EXPOSE 3001

ENV NODE_ENV=production

CMD [ "yarn", "start" ]
