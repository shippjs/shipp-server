
This module powers the Shipp suite.

Warning: This is used for a single personal project. It is not and won't be supported.


## Development Container

* For M1 Macs, BuildX enables builds for ARM processors. It must be installed.
`$ docker buildx install`

* Build the container and specify the platform (it will use buildx)
`$ docker build --platform linux/arm64/v8 -t shipp-server .`

* Enter the development environment
`$ ./dev.sh`
