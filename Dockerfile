FROM node:12.22.6-alpine

USER root
RUN apk add --no-cache bash

WORKDIR /home/app
USER node
EXPOSE 3000

ENTRYPOINT /bin/bash