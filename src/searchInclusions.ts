import { groupBy, mapValues, uniq, get, uniqBy } from 'lodash';

import { FhirVersion } from 'fhir-works-on-aws-interface';
import resourceReferencesMatrixV4 from './schema/fhirResourceReferencesMatrix.v4.0.1.json';
import resourceReferencesMatrixV3 from './schema/fhirResourceReferencesMatrix.v3.0.1.json';
import { isPresent } from './tsUtils';

export type InclusionSearchParameter = {
    type: '_include' | '_revinclude';
    isWildcard: false;
    isIterate?: true;
    sourceResource: string;
    searchParameter: string;
    targetResourceType?: string;
};

export type WildcardInclusionSearchParameter = {
    type: '_include' | '_revinclude';
    isWildcard: true;
    isIterate?: true;
};

export const inclusionParameterFromString = (
    s: string,
): Omit<InclusionSearchParameter, 'type'> | Omit<WildcardInclusionSearchParameter, 'type'> | null => {
    if (s === '*') {
        return { isWildcard: true };
    }
    const INCLUSION_PARAM_REGEX = /^(?<sourceResource>[A-Za-z]+):(?<searchParameter>[A-Za-z.]+)(?::(?<targetResourceType>[A-Za-z]+))?$/;
    const match = s.match(INCLUSION_PARAM_REGEX);
    if (match === null) {
        // Malformed inclusion search parameters are ignored. No exception is thrown.
        // This allows the regular search to complete successfully
        console.log(`Ignoring invalid include/revinclude search parameter: ${s}`);
        return null;
    }
    const { sourceResource, searchParameter, targetResourceType } = match.groups!;
    return {
        isWildcard: false,
        sourceResource,
        searchParameter,
        targetResourceType,
    };
};

const expandRevIncludeWildcard = (
    resourceTypes: string[],
    resourceReferencesMatrix: string[][],
): InclusionSearchParameter[] => {
    return resourceTypes.flatMap(resourceType => {
        return resourceReferencesMatrix
            .filter(
                // Some Resources have fields that can reference any resource type. They have their type noted as Reference(Any) on the FHIR website.
                // In those cases the targetResourceType is noted as 'Resource' in the references matrix.
                ([, , targetResourceType]) => targetResourceType === resourceType || targetResourceType === 'Resource',
            )
            .map(([sourceResource, searchParameter, targetResourceType]) => ({
                type: '_revinclude',
                isWildcard: false,
                sourceResource,
                searchParameter,
                targetResourceType: targetResourceType === 'Resource' ? undefined : targetResourceType,
            }));
    });
};

const expandIncludeWildcard = (
    resourceTypes: string[],
    resourceReferencesMatrix: string[][],
): InclusionSearchParameter[] => {
    return resourceTypes.flatMap(resourceType => {
        return resourceReferencesMatrix
            .filter(([sourceResource, ,]) => sourceResource === resourceType)
            .map(([sourceResource, searchParameter, targetResourceType]) => ({
                type: '_include',
                isWildcard: false,
                sourceResource,
                searchParameter,
                targetResourceType: targetResourceType === 'Resource' ? undefined : targetResourceType,
            }));
    });
};

export const getInclusionParametersFromQueryParams = (
    includeType: '_include' | '_revinclude',
    queryParams: any,
    iterate?: true,
): (InclusionSearchParameter | WildcardInclusionSearchParameter)[] => {
    const includeTypeKey = iterate ? `${includeType}:iterate` : includeType;
    const queryParam = queryParams?.[includeTypeKey];
    if (!queryParam) {
        return [];
    }
    if (Array.isArray(queryParam)) {
        return uniq(queryParam)
            .map(param => inclusionParameterFromString(param))
            .filter(isPresent)
            .map(inclusionParam => ({ type: includeType, ...inclusionParam }));
    }
    const inclusionParameter = inclusionParameterFromString(queryParam);
    if (inclusionParameter === null) {
        return [];
    }
    return [{ type: includeType, isIterate: iterate, ...inclusionParameter }];
};
const RELATIVE_URL_REGEX = /^[A-Za-z]+\/[A-Za-z0-9-]+$/;
export const getIncludeReferencesFromResources = (
    includes: InclusionSearchParameter[],
    resources: any[],
): { resourceType: string; id: string }[] => {
    const references = includes.flatMap(include => {
        return resources
            .filter(resource => resource.resourceType === include.sourceResource)
            .map(resource => get(resource, `${include.searchParameter}`) as any)
            .flatMap(valueAtPath => {
                if (Array.isArray(valueAtPath)) {
                    return valueAtPath.map(v => get(v, 'reference'));
                }
                return [get(valueAtPath, 'reference')];
            })
            .filter((reference): reference is string => typeof reference === 'string')
            .filter(reference => RELATIVE_URL_REGEX.test(reference))
            .map(relativeUrl => {
                const [resourceType, id] = relativeUrl.split('/');
                return { resourceType, id };
            })
            .filter(({ resourceType }) => !include.targetResourceType || include.targetResourceType === resourceType);
    });

    return uniqBy(references, x => `${x.resourceType}/${x.id}`);
};

export const getRevincludeReferencesFromResources = (
    revIncludeParameters: InclusionSearchParameter[],
    resources: any[],
): { references: string[]; revinclude: InclusionSearchParameter }[] => {
    return revIncludeParameters
        .map(revinclude => {
            const references = resources
                .filter(
                    resource =>
                        revinclude.targetResourceType === undefined ||
                        resource.resourceType === revinclude.targetResourceType,
                )
                .map(resource => `${resource.resourceType}/${resource.id}`);
            return { revinclude, references };
        })
        .filter(({ references }) => references.length > 0);
};

export const buildIncludeQuery = (
    resourceType: string,
    resourceIds: string[],
    filterRulesForActiveResources: any[],
) => ({
    index: resourceType.toLowerCase(),
    body: {
        query: {
            bool: {
                filter: [
                    {
                        terms: {
                            id: resourceIds,
                        },
                    },
                    ...filterRulesForActiveResources,
                ],
            },
        },
    },
});

export const buildRevIncludeQuery = (
    revIncludeSearchParameter: InclusionSearchParameter,
    references: string[],
    filterRulesForActiveResources: any[],
) => {
    const { sourceResource, searchParameter } = revIncludeSearchParameter;
    return {
        index: sourceResource.toLowerCase(),
        body: {
            query: {
                bool: {
                    filter: [
                        {
                            terms: {
                                [`${searchParameter}.reference.keyword`]: references,
                            },
                        },
                        ...filterRulesForActiveResources,
                    ],
                },
            },
        },
    };
};

const getResourceReferenceMatrix = (fhirVersion: FhirVersion): string[][] => {
    if (fhirVersion === '4.0.1') {
        return resourceReferencesMatrixV4;
    }

    if (fhirVersion === '3.0.1') {
        return resourceReferencesMatrixV3;
    }
    return [];
};

export const buildIncludeQueries = (
    queryParams: any,
    resources: any[],
    filterRulesForActiveResources: any[],
    fhirVersion: FhirVersion,
    iterate?: true,
): any[] => {
    const allIncludeParameters = getInclusionParametersFromQueryParams(
        '_include',
        queryParams,
        iterate,
    ) as InclusionSearchParameter[];

    const includeParameters = allIncludeParameters.some(x => x.isWildcard)
        ? expandIncludeWildcard(
              [
                  ...resources.reduce(
                      (acc: Set<string>, resource) => acc.add(resource.resourceType),
                      new Set() as Set<string>,
                  ),
              ],
              getResourceReferenceMatrix(fhirVersion),
          )
        : (allIncludeParameters as InclusionSearchParameter[]);

    const resourceReferences: { resourceType: string; id: string }[] = getIncludeReferencesFromResources(
        includeParameters,
        resources,
    );

    const resourceTypeToIds: { [resourceType: string]: string[] } = mapValues(
        groupBy(resourceReferences, resourcReference => resourcReference.resourceType),
        arr => arr.map(x => x.id),
    );

    const searchQueries = Object.entries(resourceTypeToIds).map(([resourceType, ids]) => {
        return buildIncludeQuery(resourceType, ids, filterRulesForActiveResources);
    });
    return searchQueries;
};

export const buildRevIncludeQueries = (
    queryParams: any,
    resources: any[],
    filterRulesForActiveResources: any[],
    fhirVersion: FhirVersion,
    iterate?: true,
) => {
    const allRevincludeParameters = getInclusionParametersFromQueryParams('_revinclude', queryParams, iterate);

    const revIncludeParameters = allRevincludeParameters.some(x => x.isWildcard)
        ? expandRevIncludeWildcard(
              [
                  ...resources.reduce(
                      (acc: Set<string>, resource) => acc.add(resource.resourceType),
                      new Set() as Set<string>,
                  ),
              ],
              getResourceReferenceMatrix(fhirVersion),
          )
        : (allRevincludeParameters as InclusionSearchParameter[]);

    const revincludeReferences = getRevincludeReferencesFromResources(revIncludeParameters, resources);

    const searchQueries = revincludeReferences.map(({ revinclude, references }) =>
        buildRevIncludeQuery(revinclude, references, filterRulesForActiveResources),
    );
    return searchQueries;
};
