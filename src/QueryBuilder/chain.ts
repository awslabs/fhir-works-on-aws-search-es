// eslint-disable-next-line import/prefer-default-export
import { InvalidSearchParameterError } from 'fhir-works-on-aws-interface';
import { FHIRSearchParametersRegistry } from '../FHIRSearchParametersRegistry';
import { COMPILED_CONDITION_OPERATOR_RESOLVE, NON_SEARCHABLE_PARAMETERS } from '../constants';
import { parseSearchModifiers, normalizeQueryParams, isChainedParameter } from '../FhirQueryParser/util';

export interface ChainParameter {
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
                        `Chained search parameter '${searchModifier.parameterName}' for resource type ${currentResourceType} is not a reference.`,
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
                    // check compiled[].condition for resolution
                    if (fhirSearchParam.compiled.length > 0) {
                        const compiled = fhirSearchParam.compiled.pop()!; // we can use ! since we checked length before
                        // if there is no resolve condition, we have multiple resources pointed to.
                        // condition's format is defined in `../FHIRSearchParamtersRegistry/index.ts`
                        if (!compiled.condition || compiled.condition[1] !== COMPILED_CONDITION_OPERATOR_RESOLVE) {
                            throw new InvalidSearchParameterError(
                                `Chained search parameter '${searchModifier.parameterName}' for resource type ${currentResourceType} points to multiple resource types, please specify.`,
                            );
                        }
                        // we have a resolution to a resource type
                        organizedChain.push({
                            resourceType: currentResourceType,
                            searchParam: searchModifier.parameterName,
                        });
                        // eslint-disable-next-line prefer-destructuring
                        nextResourceType = compiled.condition[2];
                    } else {
                        throw new InvalidSearchParameterError(
                            `Chained search parameter '${searchModifier.parameterName}' for resource type ${currentResourceType} points to multiple resource types, please specify.`,
                        );
                    }
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
