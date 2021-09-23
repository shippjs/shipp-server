#!/bin/bash

docker run \
--rm -it \
--name shipp-server \
-v $PWD:/home/app \
-v /Users/B/Repos/Shipp/pipemaker:/home/pipemaker \
-v /Users/B/Repos/Shipp/superloader:/home/superloader \
-v /Users/B/Repos/Shipp/compilers:/home/compilers \
-p 3000:3000 \
-p 9229:9229 \
shipp-server
