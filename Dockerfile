FROM sickp/alpine-node:6.14.0-r1

USER root
RUN apk add --no-cache bash

WORKDIR /home/app
USER node
EXPOSE 3000

ENTRYPOINT /bin/bash