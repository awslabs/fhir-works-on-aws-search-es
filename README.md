# fhir-works-on-aws-search-es

## Purpose

Please visit [fhir-works-on-aws-deployment](https://github.com/awslabs/fhir-works-on-aws-deployment) for overall vision of the project and for more context.

This package is an implementation of the search interface from the [FHIR Works interface](https://github.com/awslabs/fhir-works-on-aws-interface). It queries Elasticsearch to find the results.  To use and deploy this component (with the other 'out of the box' components) please follow the overall [README](https://github.com/awslabs/fhir-works-on-aws-deployment)

## Infrastructure

This package assumes certain infrastructure:

- Elasticsearch - The Elasticsearch cluster is indexed by ResourceType & the domain is defined by the environment variable ELASTICSEARCH_DOMAIN_ENDPOINT
- DynamoDB stream - To keep our Elasticsearch cluster in sync with the source of truth (DynamoDB) we expect the [persistence component](https://github.com/awslabs/fhir-works-on-aws-persistence-ddb) to have a DynamoDB stream, which will stream the table's updates to the Elasticsearch cluster

## Usage

For usage please add this package to your `package.json` file and install as a dependency. For usage examples please see the deployment component's [package.json](https://github.com/awslabs/fhir-works-on-aws-deployment/blob/mainline/package.json)

## Dependency tree

This package is dependent on:

- [interface component](https://github.com/awslabs/fhir-works-on-aws-interface)
  - This package defines the interface we are trying to use
- [persistence component](https://github.com/awslabs/fhir-works-on-aws-persistence-ddb)
  - This package is responsible for the DynamoDB to ES sync
- [deployment component](https://github.com/awslabs/fhir-works-on-aws-deployment)
  - This package deploys this and all the default components

## Known issues

For known issues please track the issues on the GitHub repository

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This project is licensed under the Apache-2.0 License.
