/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { InvalidSearchParameterError, TypeSearchRequest } from 'fhir-works-on-aws-interface';
import { NON_SEARCHABLE_PARAMETERS } from '../constants';
import { CompiledSearchParam, FHIRSearchParametersRegistry, SearchParam } from '../FHIRSearchParametersRegistry';
import { stringQuery } from './typeQueries/stringQuery';
import { dateQuery } from './typeQueries/dateQuery';

function typeQueryWithConditions(
    searchParam: SearchParam,
    compiledSearchParam: CompiledSearchParam,
    searchValue: string,
): any {
    let typeQuery: any;
    switch (searchParam.type) {
        case 'string':
            typeQuery = stringQuery(compiledSearchParam, searchValue);
            break;
        case 'date':
            typeQuery = dateQuery(compiledSearchParam, searchValue);
            break;
        case 'composite':
        case 'number':
        case 'quantity':
        case 'reference':
        case 'special':
        case 'token':
        case 'uri':
        default:
            typeQuery = stringQuery(compiledSearchParam, searchValue);
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

function searchParamQuery(searchParam: SearchParam, searchValue: string): any {
    const queries = searchParam.compiled.map(compiled => {
        return typeQueryWithConditions(searchParam, compiled, searchValue);
    });

    if (queries.length === 1) {
        return queries[0];
    }
    return {
        bool: {
            should: queries,
        },
    };
}

function searchRequestQuery(
    fhirSearchParametersRegistry: FHIRSearchParametersRegistry,
    request: TypeSearchRequest,
): any[] {
    const { queryParams, resourceType } = request;
    return Object.entries(queryParams)
        .filter(([searchParameter]) => !NON_SEARCHABLE_PARAMETERS.includes(searchParameter))
        .map(([searchParameter, searchValue]) => {
            const fhirSearchParam = fhirSearchParametersRegistry.getSearchParameter(resourceType, searchParameter);
            if (fhirSearchParam === undefined) {
                throw new InvalidSearchParameterError(
                    `Invalid search parameter '${searchParameter}' for resource type ${resourceType}`,
                );
            }
            return searchParamQuery(fhirSearchParam, searchValue as string);
        });
}

// eslint-disable-next-line import/prefer-default-export
export const buildQueryForAllSearchParameters = (
    fhirSearchParametersRegistry: FHIRSearchParametersRegistry,
    request: TypeSearchRequest,
    additionalFilters: any[] = [],
): any => {
    return {
        bool: {
            filter: additionalFilters,
            must: searchRequestQuery(fhirSearchParametersRegistry, request),
        },
    };
};
