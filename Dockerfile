FROM node:10.24.1-alpine

USER root
RUN apk add --no-cache bash

WORKDIR /home/app
USER node
EXPOSE 3000

ENTRYPOINT /bin/bash