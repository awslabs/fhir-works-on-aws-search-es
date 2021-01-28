# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [2.0.1](https://github.com/awslabs/fhir-works-on-aws-search-es/compare/v2.0.0...v2.0.1) (2021-01-27)


### Bug Fixes

* update SearchFilter logic ([#39](https://github.com/awslabs/fhir-works-on-aws-search-es/issues/39)) ([84f4af9](https://github.com/awslabs/fhir-works-on-aws-search-es/commit/84f4af99be9dd1ab5da100b0d52d870aa26a98a5))

## [2.0.0](https://github.com/awslabs/fhir-works-on-aws-search-es/compare/v1.1.0...v2.0.0) (2021-01-13)


### ⚠ BREAKING CHANGES

* updated to interface 7.0.0 which adds the `SearchFilter` type that is now used as param for the `ElasticSearchService` constructor.

### Features

* support AWS_REGION env var in IS_OFFLINE mode ([#24](https://github.com/awslabs/fhir-works-on-aws-search-es/issues/24)) ([5545524](https://github.com/awslabs/fhir-works-on-aws-search-es/commit/55455243c04e7a3a371232e70c040ff32066ce90))
* support standard FHIR search parameters ([#36](https://github.com/awslabs/fhir-works-on-aws-search-es/issues/36)) ([6360480](https://github.com/awslabs/fhir-works-on-aws-search-es/commit/636048020788e58cea780bca3cedf05f415b9ff6))
* Updating ElasticSearchService to use new SearchFilter interface ([#30](https://github.com/awslabs/fhir-works-on-aws-search-es/issues/30)) ([cf6c402](https://github.com/awslabs/fhir-works-on-aws-search-es/commit/cf6c40219e9c971beefc9d9c51781855b34aa7b7))

## [1.1.0] - 2020-10-01

- feat: Implement _include and _revinclude search parameters
- feat: Support _id search parameter

## [1.0.0] - 2020-08-31

### Added

- Initial launch! :rocket:
