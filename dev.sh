#!/bin/bash

docker run --rm -it --name shipp-server -v $PWD:/home/app -p 3000:3000 shipp-server