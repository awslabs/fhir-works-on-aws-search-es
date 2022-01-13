/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 *
 */

import {
    DateSearchValue,
    NumberSearchValue,
    ParsedFhirQueryParams,
    QueryParam,
    StringLikeSearchValue,
} from '../FhirQueryParser';
import { CompiledSearchParam, SearchParam } from '../FHIRSearchParametersRegistry';
import { numberMatch } from './matchers/numberMatch';
import { dateMatch } from './matchers/dateMatch';
import { getAllValuesForFHIRPath } from '../getAllValuesForFHIRPath';
import { stringMatch } from './matchers/stringMatch';

const typeMatcher = (
    searchParam: SearchParam,
    compiledSearchParam: CompiledSearchParam,
    searchValue: unknown,
    resourceValue: any,
): boolean => {
    switch (searchParam.type) {
        case 'string':
            return stringMatch(searchValue as StringLikeSearchValue, resourceValue);
        case 'date':
            return dateMatch(searchValue as DateSearchValue, resourceValue);
        case 'number':
            return numberMatch(searchValue as NumberSearchValue, resourceValue);
        case 'quantity':
            break;
        case 'reference':
            break;
        case 'token':
            break;
        case 'composite':
            break;
        case 'special':
            break;
        case 'uri':
            break;
        default:
            // eslint-disable-next-line no-case-declarations
            const exhaustiveCheck: never = searchParam.type;
            return exhaustiveCheck;
    }

    return false;
};

function evaluateCompiledCondition(condition: string[] | undefined, resource: any): boolean {
    if (condition === undefined) {
        return true;
    }

    const resourceValues = getAllValuesForFHIRPath(resource, condition[0]);

    if (condition[1] === '=') {
        return resourceValues.some((resourceValue) => resourceValue === condition[2]);
    }

    if (condition[1] === 'resolve') {
        const resourceType = condition[2];
        return resourceValues.some((resourceValue) => {
            const referenceField = resourceValue?.reference;
            return (
                resourceValue?.type === resourceType ||
                (typeof referenceField === 'string' && referenceField.startsWith(`${resourceType}/`))
            );
        });
    }

    return false;
}

function evaluateQueryParam(queryParam: QueryParam, resource: any): boolean {
    return queryParam.parsedSearchValues.some((parsedSearchValue) =>
        queryParam.searchParam.compiled.some(
            (compiled) =>
                evaluateCompiledCondition(compiled.condition, resource) &&
                getAllValuesForFHIRPath(resource, compiled.path).some((resourceValue) =>
                    typeMatcher(queryParam.searchParam, compiled, parsedSearchValue, resourceValue),
                ),
        ),
    );
}

/**
 * checks if the given resource is matched by a FHIR search query
 * @param parsedFhirQueryParams - parsed FHIR search query
 * @param resource - FHIR resource to be matched
 */
// eslint-disable-next-line import/prefer-default-export
export function matchParsedFhirQueryParams(parsedFhirQueryParams: ParsedFhirQueryParams, resource: any): boolean {
    if (parsedFhirQueryParams.resourceType !== resource?.resourceType) {
        return false;
    }

    return parsedFhirQueryParams.searchParams.every((queryParam) => evaluateQueryParam(queryParam, resource));
}
