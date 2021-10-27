// eslint-disable-next-line import/prefer-default-export
import { InvalidSearchParameterError } from 'fhir-works-on-aws-interface';
import { FHIRSearchParametersRegistry } from '../FHIRSearchParametersRegistry';
import { NON_SEARCHABLE_PARAMETERS } from '../constants';
import { parseSearchModifiers, normalizeQueryParams, isChainedParameter } from './util';

interface ChainParameter {
    chain: { resourceType: string; searchParam: string }[];
    initialValue: string[];
}

const parseChainedParameters = (
    fhirSearchParametersRegistry: FHIRSearchParametersRegistry,
    resourceType: string,
    queryParams: any,
): ChainParameter[] => {
    const parsedChainedParam: ChainParameter[] = Object.entries(normalizeQueryParams(queryParams))
        .filter(
            ([searchParameter]) =>
                !NON_SEARCHABLE_PARAMETERS.includes(searchParameter) && isChainedParameter(searchParameter),
        )
        .flatMap(([searchParameter, searchValues]) => {
            // Validate chain and add resource type
            const chain = searchParameter.split('.');
            const lastChain: string = <string>chain.pop();
            let currentResourceType = resourceType;
            const organizedChain: { resourceType: string; searchParam: string }[] = [];
            chain.forEach((currentSearchParam) => {
                const searchModifier = parseSearchModifiers(currentSearchParam);
                const fhirSearchParam = fhirSearchParametersRegistry.getSearchParameter(
                    currentResourceType,
                    searchModifier.parameterName,
                );
                if (fhirSearchParam === undefined) {
                    throw new InvalidSearchParameterError(
                        `Invalid search parameter '${searchModifier.parameterName}' for resource type ${currentResourceType}`,
                    );
                }
                if (fhirSearchParam.type !== 'reference') {
                    throw new InvalidSearchParameterError(
                        `Chained search parameter '${searchModifier.parameterName}' for resource type ${currentResourceType} does not point to another resource.`,
                    );
                }
                let nextResourceType;
                if (searchModifier.modifier) {
                    if (fhirSearchParam.target?.includes(searchModifier.modifier)) {
                        organizedChain.push({
                            resourceType: currentResourceType,
                            searchParam: searchModifier.parameterName,
                        });
                        nextResourceType = searchModifier.modifier;
                    } else {
                        throw new InvalidSearchParameterError(
                            `Chained search parameter '${searchModifier.parameterName}' for resource type ${currentResourceType} does not point to resource type ${searchModifier.modifier}.`,
                        );
                    }
                } else if (fhirSearchParam.target?.length !== 1) {
                    throw new InvalidSearchParameterError(
                        `Chained search parameter '${searchModifier.parameterName}' for resource type ${currentResourceType} points to multiple resource types, please specify.`,
                    );
                } else {
                    organizedChain.push({
                        resourceType: currentResourceType,
                        searchParam: searchModifier.parameterName,
                    });
                    [nextResourceType] = fhirSearchParam.target;
                }
                currentResourceType = nextResourceType;
            });
            organizedChain.push({ resourceType: currentResourceType, searchParam: lastChain });
            return {
                chain: organizedChain.reverse(),
                initialValue: searchValues,
            };
        });
    return parsedChainedParam;
};

export default parseChainedParameters;
