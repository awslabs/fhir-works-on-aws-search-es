# aws-fhir-search-es

## Purpose

Please visit [aws-fhir-solution](https://github.com/awslabs/aws-fhir-solution) for overall vision of the project and for more context.

This package is an implementation of the search interface. It queries the Elastic Search Service to find the results. This also means that it assumes the ES cluster will be up to date and indexed by ResourceType. This assumption is achieved by the DynamoDB stream to ES lambda built in the [persistence component](https://github.com/awslabs/aws-fhir-persistence-ddb). To use and deploy this component (with the other default components) please follow the overall [README](https://github.com/awslabs/aws-fhir-solution)

## Usage

For usage please add this package to your `package.json` file and install as a dependency. For usage examples please see the [deployment component](https://github.com/awslabs/aws-fhir-solution)

## Dependency tree

This package is dependent on:

- [interface component](https://github.com/awslabs/aws-fhir-interface)
  - This package defines the interface we are trying to use
- [persistence component](https://github.com/awslabs/aws-fhir-persistence-ddb)
  - This package is responsible for the DynamoDB to ES sync
- [deployment component](https://github.com/awslabs/aws-fhir-solution)
  - This package deploys this and all the default components

## Known issues

For known issues please track the issues on the GitHub repository

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This project is licensed under the Apache-2.0 License.
