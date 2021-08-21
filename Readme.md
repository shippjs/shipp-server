
This module powers the Shipp suite. It is not yet intended to be used in production.

Note on semver: we will not be adhering to traiditonal semver prior to version 1.0. This allows
thoughtful refactoring of the API without giving the appearance of more mature software via
unnecessarily high version numbers.

Prior to v1.0, please consider any minor change (e.g. v0.13 to v0.14) to be potentially breaking.


## Development Container

* For M1 Macs, BuildX enables builds for ARM processors. It must be installed.
`$ docker buildx install`

* Build the container and specify the platform (it will use buildx)
`$ docker build --platform linux/arm64/v8 -t shipp-server .`

* Enter the development environment
`$ ./dev.sh`
