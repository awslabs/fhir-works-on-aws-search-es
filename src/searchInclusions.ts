/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */
import { groupBy, mapValues, uniq, get, uniqBy } from 'lodash';

import { isPresent } from './tsUtils';
import { FHIRSearchParametersRegistry } from './FHIRSearchParametersRegistry';
import getComponentLogger from './loggerBuilder';
import { Query } from './elasticSearchService';
import { getAllValuesForFHIRPath } from './getAllValuesForFHIRPath';
import { MAX_INCLUSION_PARAM_RESULTS } from './constants';

const logger = getComponentLogger();

/**
 * @example
 * The following query:
 * https://my-fwoa-server/ImmunizationRecommendation?_include=ImmunizationRecommendation:information:Patient
 * results in:
 * {
 *   type: '_include',
 *   isWildcard: false,
 *   sourceResource: 'ImmunizationRecommendation',
 *   searchParameter: 'information',
 *   path: 'ImmunizationRecommendation.recommendation.supportingPatientInformation'
 *   targetResourceType: 'Patient'
 * }
 *
 * path is the actual object path where the reference value can be found. All valid search params have a path.
 * path is optional since InclusionSearchParameter is first built from the query params and the path is added afterwards if it is indeed a valid search parameter.
 */
export type InclusionSearchParameter = {
    type: '_include' | '_revinclude';
    isWildcard: false;
    isIterate?: true;
    sourceResource: string;
    searchParameter: string;
    path?: string;
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
    const INCLUSION_PARAM_REGEX =
        /^(?<sourceResource>[A-Za-z]+):(?<searchParameter>[A-Za-z-]+)(?::(?<targetResourceType>[A-Za-z]+))?$/;
    const match = s.match(INCLUSION_PARAM_REGEX);
    if (match === null) {
        // Malformed inclusion search parameters are ignored. No exception is thrown.
        // This allows the regular search to complete successfully
        logger.info(`Ignoring invalid include/revinclude search parameter: ${s}`);
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
    fhirSearchParametersRegistry: FHIRSearchParametersRegistry,
): InclusionSearchParameter[] => {
    return resourceTypes.flatMap((resourceType) => {
        return fhirSearchParametersRegistry.getRevIncludeSearchParameters(resourceType).flatMap((searchParam) => {
            return searchParam.target!.map((target) => ({
                type: '_revinclude',
                isWildcard: false,
                sourceResource: searchParam.base,
                searchParameter: searchParam.name,
                path: searchParam.compiled[0].path,
                targetResourceType: target,
            }));
        });
    });
};

const expandIncludeWildcard = (
    resourceTypes: string[],
    fhirSearchParametersRegistry: FHIRSearchParametersRegistry,
): InclusionSearchParameter[] => {
    return resourceTypes.flatMap((resourceType) => {
        return fhirSearchParametersRegistry.getIncludeSearchParameters(resourceType).flatMap((searchParam) => {
            return searchParam.target!.map((target) => ({
                type: '_include',
                isWildcard: false,
                sourceResource: searchParam.base,
                searchParameter: searchParam.name,
                path: searchParam.compiled[0].path,
                targetResourceType: target,
            }));
        });
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
            .map((param) => inclusionParameterFromString(param))
            .filter(isPresent)
            .map((inclusionParam) => ({ type: includeType, ...inclusionParam }));
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
    const references = includes.flatMap((include) => {
        return resources
            .filter((resource) => resource.resourceType === include.sourceResource)
            .flatMap((resource) => getAllValuesForFHIRPath(resource, `${include.path}`))
            .flatMap((valueAtPath) => {
                if (Array.isArray(valueAtPath)) {
                    return valueAtPath.map((v) => get(v, 'reference'));
                }
                return [get(valueAtPath, 'reference')];
            })
            .filter((reference): reference is string => typeof reference === 'string')
            .filter((reference) => RELATIVE_URL_REGEX.test(reference))
            .map((relativeUrl) => {
                const [resourceType, id] = relativeUrl.split('/');
                return { resourceType, id };
            })
            .filter(({ resourceType }) => !include.targetResourceType || include.targetResourceType === resourceType);
    });

    return uniqBy(references, (x) => `${x.resourceType}/${x.id}`);
};

export const getRevincludeReferencesFromResources = (
    revIncludeParameters: InclusionSearchParameter[],
    resources: any[],
): { references: string[]; revinclude: InclusionSearchParameter }[] => {
    return revIncludeParameters
        .map((revinclude) => {
            const references = resources
                .filter(
                    (resource) =>
                        revinclude.targetResourceType === undefined ||
                        resource.resourceType === revinclude.targetResourceType,
                )
                .map((resource) => `${resource.resourceType}/${resource.id}`);
            return { revinclude, references };
        })
        .filter(({ references }) => references.length > 0);
};

export const buildIncludeQuery = (
    resourceType: string,
    resourceIds: string[],
    filterRulesForActiveResources: any[],
): Query => ({
    resourceType,
    queryRequest: {
        size: MAX_INCLUSION_PARAM_RESULTS,
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
    },
});

export const buildRevIncludeQuery = (
    revIncludeSearchParameter: InclusionSearchParameter,
    references: string[],
    filterRulesForActiveResources: any[],
    useKeywordSubFields: boolean,
): Query => {
    const keywordSuffix = useKeywordSubFields ? '.keyword' : '';
    const { sourceResource, path } = revIncludeSearchParameter;
    return {
        resourceType: sourceResource,
        queryRequest: {
            size: MAX_INCLUSION_PARAM_RESULTS,
            body: {
                query: {
                    bool: {
                        filter: [
                            {
                                terms: {
                                    [`${path}.reference${keywordSuffix}`]: references,
                                },
                            },
                            ...filterRulesForActiveResources,
                        ],
                    },
                },
            },
        },
    };
};

const validateAndAddPath = (
    fhirSearchParametersRegistry: FHIRSearchParametersRegistry,
    inclusionSearchParameters: InclusionSearchParameter[],
): InclusionSearchParameter[] => {
    const validInclusionSearchParams: InclusionSearchParameter[] = [];

    inclusionSearchParameters.forEach((includeParam) => {
        const searchParam = fhirSearchParametersRegistry.getReferenceSearchParameter(
            includeParam.sourceResource,
            includeParam.searchParameter,
            includeParam.targetResourceType,
        );

        if (searchParam !== undefined) {
            validInclusionSearchParams.push({ ...includeParam, path: searchParam.compiled[0].path });
        }
    });

    return validInclusionSearchParams;
};

export const buildIncludeQueries = (
    queryParams: any,
    resources: any[],
    filterRulesForActiveResources: any[],
    fhirSearchParametersRegistry: FHIRSearchParametersRegistry,
    iterate?: true,
): Query[] => {
    const allIncludeParameters = getInclusionParametersFromQueryParams(
        '_include',
        queryParams,
        iterate,
    ) as InclusionSearchParameter[];

    const includeParameters = allIncludeParameters.some((x) => x.isWildcard)
        ? expandIncludeWildcard(
              [
                  ...resources.reduce(
                      (acc: Set<string>, resource) => acc.add(resource.resourceType),
                      new Set() as Set<string>,
                  ),
              ],
              fhirSearchParametersRegistry,
          )
        : validateAndAddPath(fhirSearchParametersRegistry, allIncludeParameters);

    const resourceReferences: { resourceType: string; id: string }[] = getIncludeReferencesFromResources(
        includeParameters,
        resources,
    );

    const resourceTypeToIds: { [resourceType: string]: string[] } = mapValues(
        groupBy(resourceReferences, (resourcReference) => resourcReference.resourceType),
        (arr) => arr.map((x) => x.id),
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
    fhirSearchParametersRegistry: FHIRSearchParametersRegistry,
    useKeywordSubFields: boolean,
    iterate?: true,
): Query[] => {
    const allRevincludeParameters = getInclusionParametersFromQueryParams('_revinclude', queryParams, iterate);

    const revIncludeParameters = allRevincludeParameters.some((x) => x.isWildcard)
        ? expandRevIncludeWildcard(
              [
                  ...resources.reduce(
                      (acc: Set<string>, resource) => acc.add(resource.resourceType),
                      new Set() as Set<string>,
                  ),
              ],
              fhirSearchParametersRegistry,
          )
        : validateAndAddPath(fhirSearchParametersRegistry, allRevincludeParameters as InclusionSearchParameter[]);

    const revincludeReferences = getRevincludeReferencesFromResources(revIncludeParameters, resources);

    const searchQueries = revincludeReferences.map(({ revinclude, references }) =>
        buildRevIncludeQuery(revinclude, references, filterRulesForActiveResources, useKeywordSubFields),
    );
    return searchQueries;
};
