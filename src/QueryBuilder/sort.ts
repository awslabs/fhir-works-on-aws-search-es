/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 *
 */

import { InvalidSearchParameterError } from 'fhir-works-on-aws-interface';
import { FHIRSearchParametersRegistry } from '../FHIRSearchParametersRegistry';

interface SortParameter {
    order: 'asc' | 'desc';
    searchParam: string;
}

export const parseSortParameter = (param: string): SortParameter[] => {
    const parts = param.split(',');
    return parts.map(s => {
        const order = s.startsWith('-') ? 'desc' : 'asc';
        return {
            order,
            searchParam: s.replace(/^-/, ''),
        };
    });
};

// eslint-disable-next-line import/prefer-default-export
export const buildSortClause = (
    fhirSearchParametersRegistry: FHIRSearchParametersRegistry,
    resourceType: string,
    sortQueryParam: string | string[],
    // request: TypeSearchRequest,
): any => {
    // const sortQueryParam = request.queryParams[SORT_PARAMETER];

    if (Array.isArray(sortQueryParam)) {
        throw new InvalidSearchParameterError('_sort parameter cannot be used multiple times on a search query');
    }
    const sortParams = parseSortParameter(sortQueryParam);

    return sortParams.flatMap(sortParam => {
        const searchParameter = fhirSearchParametersRegistry.getSearchParameter(resourceType, sortParam.searchParam);
        if (searchParameter === undefined) {
            throw new InvalidSearchParameterError(
                `Unknown _sort parameter value: ${sortParam.searchParam}. Sort parameters values must use a valid Search Parameter`,
            );
        }
        if (searchParameter.type !== 'date') {
            throw new InvalidSearchParameterError(
                `Invalid _sort parameter: ${sortParam.searchParam}. Only date type parameters can be used for sorting`,
            );
        }
        return searchParameter.compiled.map(compiledParam => {
            return {
                [compiledParam.path]: {
                    order: sortParam.order,
                    // unmapped_type makes queries more fault tolerant. Since we are using dynamic mapping there's no guarantee
                    // that the mapping exists at query time. This ignores the unmapped field instead of failing
                    unmapped_type: 'long',
                },
            };
        });
    });
};
