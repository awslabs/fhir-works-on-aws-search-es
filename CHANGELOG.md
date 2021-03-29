# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [2.2.0](https://github.com/awslabs/fhir-works-on-aws-search-es/compare/v2.1.0...v2.2.0) (2021-03-29)


### Features

* add Implementation Guides support ([#50](https://github.com/awslabs/fhir-works-on-aws-search-es/issues/50)) ([dc92eae](https://github.com/awslabs/fhir-works-on-aws-search-es/commit/dc92eaea24339bc2d4a08d182e0506916735d69c)), closes [#45](https://github.com/awslabs/fhir-works-on-aws-search-es/issues/45) [#48](https://github.com/awslabs/fhir-works-on-aws-search-es/issues/48)

## [2.1.0](https://github.com/awslabs/fhir-works-on-aws-search-es/compare/v2.0.1...v2.1.0) (2021-02-09)


### Features

* Add ImplementationGuides compile method ([#38](https://github.com/awslabs/fhir-works-on-aws-search-es/issues/38)) ([e0024a4](https://github.com/awslabs/fhir-works-on-aws-search-es/commit/e0024a4812591cbb2a056851be06cf7e9bfb35a7))
* parse xpath expressions to support choice of data types ([#44](https://github.com/awslabs/fhir-works-on-aws-search-es/issues/44)) ([ca70bdd](https://github.com/awslabs/fhir-works-on-aws-search-es/commit/ca70bdd16c84134b9b5da0662c69fabdd5f98565))
* update compiler to properly handle params from IGs ([#41](https://github.com/awslabs/fhir-works-on-aws-search-es/issues/41)) ([b616c78](https://github.com/awslabs/fhir-works-on-aws-search-es/commit/b616c78e3b9d87b1955e38af6c3242abc2f449da))


### Bug Fixes

* properly handle special characters in queries ([#43](https://github.com/awslabs/fhir-works-on-aws-search-es/issues/43)) ([e586b57](https://github.com/awslabs/fhir-works-on-aws-search-es/commit/e586b576c71c4583b61834af7aa209fa2f8ec4eb))

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
