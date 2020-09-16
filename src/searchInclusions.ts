import { groupBy, mapValues, uniq } from 'lodash';

export interface InclusionSearchParameter {
    sourceResource: string;
    searchParameter: string;
    targetResourceType?: string;
}

export interface IncludeSearchParameter extends InclusionSearchParameter {
    type: '_include';
}

export interface RevIncludeSearchParameter extends InclusionSearchParameter {
    type: '_revinclude';
}

export type TypedInclusionParameter = RevIncludeSearchParameter | IncludeSearchParameter;

export const inclusionParameterFromString = (s: string): InclusionSearchParameter | null => {
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
        sourceResource,
        searchParameter,
        targetResourceType,
    };
};

export const getInclusionParametersFromQueryParams = (
    includeType: '_include' | '_revinclude',
    queryParams: any,
): TypedInclusionParameter[] => {
    const queryParam = queryParams?.[includeType];
    if (!queryParam) {
        return [];
    }
    if (Array.isArray(queryParam)) {
        return uniq(queryParam)
            .map(x => inclusionParameterFromString(x))
            .filter((x): x is InclusionSearchParameter => x !== null)
            .map(x => ({ type: includeType, ...x }));
    }
    const inclusionParameter = inclusionParameterFromString(queryParam);
    if (inclusionParameter === null) {
        return [];
    }
    return [{ type: includeType, ...inclusionParameter }];
};

export const getReferencesFromResources = (
    includes: IncludeSearchParameter[],
    resources: any[],
    requestResourceType: string,
): { resourceType: string; id: string }[] => {
    return includes.flatMap(include => {
        if (include.sourceResource !== requestResourceType) {
            return [];
        }
        const RELATIVE_URL_REGEX = /^[A-Za-z]+\/[A-Za-z0-9-]+$/;
        return resources
            .map(resource => resource[include.searchParameter]?.reference)
            .filter((x): x is string => typeof x === 'string')
            .filter(reference => RELATIVE_URL_REGEX.test(reference))
            .map(relativeUrl => {
                const [resourceType, id] = relativeUrl.split('/');
                return { resourceType, id };
            })
            .filter(({ resourceType }) => !include.targetResourceType || include.targetResourceType === resourceType);
    });
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
    revIncludeSearchParameter: RevIncludeSearchParameter,
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

export const buildIncludeQueries = (
    queryParams: any,
    resources: any[],
    requestResourceType: string,
    filterRulesForActiveResources: any[],
): any[] => {
    const includeParameters = getInclusionParametersFromQueryParams(
        '_include',
        queryParams,
    ) as IncludeSearchParameter[];

    const resourceReferences: { resourceType: string; id: string }[] = getReferencesFromResources(
        includeParameters,
        resources,
        requestResourceType,
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
    requestResourceType: string,
    filterRulesForActiveResources: any[],
) => {
    const revIncludeParameters = getInclusionParametersFromQueryParams(
        '_revinclude',
        queryParams,
    ) as RevIncludeSearchParameter[];

    const references: string[] = resources.map(resource => `${resource.resourceType}/${resource.id}`);
    const searchQueries = revIncludeParameters
        .filter(revinclude => {
            const { targetResourceType } = revinclude;
            return !targetResourceType || targetResourceType === requestResourceType;
        })
        .map(revinclude => {
            return buildRevIncludeQuery(revinclude, references, filterRulesForActiveResources);
        });
    return searchQueries;
};
