/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { isEmpty } from 'lodash';
import { InvalidSearchParameterError, TypeSearchRequest } from 'fhir-works-on-aws-interface';
import { NON_SEARCHABLE_PARAMETERS } from '../constants';
import { CompiledSearchParam, FHIRSearchParametersRegistry, SearchParam } from '../FHIRSearchParametersRegistry';
import { stringQuery } from './typeQueries/stringQuery';
import { dateQuery } from './typeQueries/dateQuery';
import { tokenQuery } from './typeQueries/tokenQuery';
import { numberQuery } from './typeQueries/numberQuery';
import { quantityQuery } from './typeQueries/quantityQuery';
import { referenceQuery } from './typeQueries/referenceQuery';
import getOrSearchValues from './searchOR';
import parseSearchModifiers from './searchModifiers';
import { uriQuery } from './typeQueries/uriQuery';

function typeQueryWithConditions(
    searchParam: SearchParam,
    compiledSearchParam: CompiledSearchParam,
    searchValue: string,
    useKeywordSubFields: boolean,
    baseUrl: string,
    modifier?: string,
): any {
    let typeQuery: any;
    switch (searchParam.type) {
        case 'string':
            typeQuery = stringQuery(compiledSearchParam, searchValue, modifier);
            break;
        case 'date':
            typeQuery = dateQuery(compiledSearchParam, searchValue, modifier);
            break;
        case 'token':
            typeQuery = tokenQuery(compiledSearchParam, searchValue, useKeywordSubFields, modifier);
            break;
        case 'number':
            typeQuery = numberQuery(compiledSearchParam, searchValue, modifier);
            break;
        case 'quantity':
            typeQuery = quantityQuery(compiledSearchParam, searchValue, useKeywordSubFields, modifier);
            break;
        case 'reference':
            typeQuery = referenceQuery(
                compiledSearchParam,
                searchValue,
                useKeywordSubFields,
                baseUrl,
                searchParam.name,
                searchParam.target,
                modifier,
            );
            break;
        case 'uri':
            typeQuery = uriQuery(compiledSearchParam, searchValue, useKeywordSubFields, modifier);
            break;
        case 'composite':
        case 'special':
        default:
            typeQuery = stringQuery(compiledSearchParam, searchValue, modifier);
    }
    // In most cases conditions are used for fields that are an array of objects
    // Ideally we should be using a nested query, but that'd require to update the index mappings.
    //
    // Simply using an array of bool.must is good enough for most cases. The result will contain the correct documents, however it MAY contain additional documents
    // https://www.elastic.co/guide/en/elasticsearch/reference/current/nested.html
    if (compiledSearchParam.condition !== undefined) {
        return {
            bool: {
                must: [
                    typeQuery,
                    {
                        multi_match: {
                            fields: [compiledSearchParam.condition[0], `${compiledSearchParam.condition[0]}.*`],
                            query: compiledSearchParam.condition[2],
                            lenient: true,
                        },
                    },
                ],
            },
        };
    }
    return typeQuery;
}

function searchParamQuery(
    searchParam: SearchParam,
    searchValue: string,
    useKeywordSubFields: boolean,
    baseUrl: string,
    modifier?: string,
): any {
    const splitSearchValue = getOrSearchValues(searchValue);
    let queryList = [];
    for (let i = 0; i < splitSearchValue.length; i += 1) {
        queryList.push(
            searchParam.compiled.map(compiled =>
                typeQueryWithConditions(
                    searchParam,
                    compiled,
                    splitSearchValue[i],
                    useKeywordSubFields,
                    baseUrl,
                    modifier,
                ),
            ),
        );
    }
    // flatten array of arrays of results into one array with results
    queryList = queryList.flat(1);
    if (queryList.length === 1) {
        return queryList[0];
    }
    return {
        bool: {
            should: queryList,
        },
    };
}

function normalizeQueryParams(queryParams: any): { [key: string]: string[] } {
    const normalizedQueryParams: { [key: string]: string[] } = {};

    Object.entries(queryParams).forEach(([searchParameter, searchValue]) => {
        if (typeof searchValue === 'string') {
            normalizedQueryParams[searchParameter] = [searchValue];
            return;
        }
        if (Array.isArray(searchValue) && searchValue.every(s => typeof s === 'string')) {
            normalizedQueryParams[searchParameter] = searchValue;
            return;
        }

        // This may occur if the router has advanced querystring parsing enabled
        // e.g. {{API_URL}}/Patient?name[key]=Smith may be parsed into {"name":{"key":"Smith"}}
        throw new InvalidSearchParameterError(`Invalid search parameter: '${searchParameter}'`);
    });

    return normalizedQueryParams;
}

function isChainedParameter(parameterKey: string) {
    return parameterKey.match('[A-Za-z][.][A-Za-z]');
}

function searchRequestQuery(
    fhirSearchParametersRegistry: FHIRSearchParametersRegistry,
    queryParams: any,
    resourceType: string,
    baseUrl: string,
    useKeywordSubFields: boolean,
): any[] {
    return Object.entries(normalizeQueryParams(queryParams))
        .filter(
            ([searchParameter]) =>
                !NON_SEARCHABLE_PARAMETERS.includes(searchParameter) && !isChainedParameter(searchParameter),
        )
        .flatMap(([searchParameter, searchValues]) => {
            const searchModifier = parseSearchModifiers(searchParameter);
            const fhirSearchParam = fhirSearchParametersRegistry.getSearchParameter(
                resourceType,
                searchModifier.parameterName,
            );
            if (fhirSearchParam === undefined) {
                throw new InvalidSearchParameterError(
                    `Invalid search parameter '${searchModifier.parameterName}' for resource type ${resourceType}`,
                );
            }
            return searchValues.map(searchValue =>
                searchParamQuery(fhirSearchParam, searchValue, useKeywordSubFields, baseUrl, searchModifier.modifier),
            );
        });
}

// eslint-disable-next-line import/prefer-default-export
export const getOrganizedChainedParameters = (
    fhirSearchParametersRegistry: FHIRSearchParametersRegistry,
    request: TypeSearchRequest,
): any => {
    const organizedChainedParam = Object.entries(normalizeQueryParams(request.queryParams))
        .filter(
            ([searchParameter]) =>
                !NON_SEARCHABLE_PARAMETERS.includes(searchParameter) && isChainedParameter(searchParameter),
        )
        .flatMap(([searchParameter, searchValues]) => {
            // Validate chain and add resource type
            const chain = searchParameter.split('.');
            const initialSearchParam: any = chain.pop();
            let currentResourceType = request.resourceType;
            const organizedChain: string[] = [];
            chain.forEach(currentSearchParam => {
                const searchModifier = parseSearchModifiers(currentSearchParam, false);
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
                        organizedChain.push(currentSearchParam);
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
                    organizedChain.push(`${searchModifier.parameterName}:${fhirSearchParam.target[0]}`);
                    [nextResourceType] = fhirSearchParam.target;
                }

                currentResourceType = nextResourceType;
            });
            return { chain: organizedChain, searchQuery: { [initialSearchParam]: searchValues } };
        });
    return organizedChainedParam;
};

// eslint-disable-next-line import/prefer-default-export
export const buildQueryForAllSearchParameters = (
    fhirSearchParametersRegistry: FHIRSearchParametersRegistry,
    request: TypeSearchRequest,
    useKeywordSubFields: boolean,
    additionalFilters: any[] = [],
    chainedParameterQuery: any = {},
): any => {
    const esQuery = searchRequestQuery(
        fhirSearchParametersRegistry,
        request.queryParams,
        request.resourceType,
        request.baseUrl,
        useKeywordSubFields,
    );
    if (!isEmpty(chainedParameterQuery)) {
        const ESChainedParamQuery = searchRequestQuery(
            fhirSearchParametersRegistry,
            chainedParameterQuery,
            request.resourceType,
            request.baseUrl,
            useKeywordSubFields,
        );
        esQuery.push({
            bool: {
                should: ESChainedParamQuery,
            },
        });
    }
    return {
        bool: {
            filter: additionalFilters,
            must: esQuery,
        },
    };
};

export { buildSortClause } from './sort';
