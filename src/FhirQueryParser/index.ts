/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 *
 */
import { size } from 'lodash';
import { InvalidSearchParameterError } from 'fhir-works-on-aws-interface';
import { FHIRSearchParametersRegistry, SearchParam } from '../FHIRSearchParametersRegistry';
import { isChainedParameter, normalizeQueryParams, parseSearchModifiers } from './util';
import { NON_SEARCHABLE_PARAMETERS } from '../constants';
import getOrSearchValues from './searchOR';
import { DateSearchValue, parseDateSearchValue } from './typeParsers/dateParser';
import { parseTokenSearchValue, TokenSearchValue } from './typeParsers/tokenParser';
import { NumberSearchValue, parseNumberSearchValue } from './typeParsers/numberParser';
import { parseQuantitySearchValue, QuantitySearchValue } from './typeParsers/quantityParser';

export { DateSearchValue, TokenSearchValue, NumberSearchValue, QuantitySearchValue };

export type StringLikeSearchValue = string;

interface BaseQueryParam {
    name: string;
    modifier?: string;
    searchParam: SearchParam;
}

export interface StringQueryParam extends BaseQueryParam {
    type: 'string';
    parsedSearchValues: StringLikeSearchValue[];
}

export interface CompositeQueryParam extends BaseQueryParam {
    type: 'composite';
    parsedSearchValues: StringLikeSearchValue[];
}

export interface SpecialQueryParam extends BaseQueryParam {
    type: 'special';
    parsedSearchValues: StringLikeSearchValue[];
}

export interface UriQueryParam extends BaseQueryParam {
    type: 'uri';
    parsedSearchValues: StringLikeSearchValue[];
}

export interface DateQueryParam extends BaseQueryParam {
    type: 'date';
    parsedSearchValues: DateSearchValue[];
}

export interface NumberQueryParam extends BaseQueryParam {
    type: 'number';
    parsedSearchValues: NumberSearchValue[];
}

export interface QuantityQueryParam extends BaseQueryParam {
    type: 'quantity';
    parsedSearchValues: QuantitySearchValue[];
}

export interface ReferenceQueryParam extends BaseQueryParam {
    type: 'reference';
    parsedSearchValues: StringLikeSearchValue[];
}

export interface TokenQueryParam extends BaseQueryParam {
    type: 'token';
    parsedSearchValues: TokenSearchValue[];
}

export type QueryParam =
    | StringQueryParam
    | DateQueryParam
    | NumberQueryParam
    | QuantityQueryParam
    | ReferenceQueryParam
    | TokenQueryParam
    | CompositeQueryParam
    | SpecialQueryParam
    | UriQueryParam;

export interface ParsedFhirQueryParams {
    resourceType: string;
    searchParams: QueryParam[];
    hasUnsearchableParams: boolean;
}

const parseStringLikeSearchValue = (rawSearchValue: string): StringLikeSearchValue => rawSearchValue;

const parseSearchQueryParam = (searchParam: SearchParam, rawSearchValue: string): QueryParam => {
    const orSearchValues = getOrSearchValues(rawSearchValue);
    switch (searchParam.type) {
        case 'date':
            return {
                type: searchParam.type,
                name: searchParam.name,
                searchParam,
                parsedSearchValues: orSearchValues.map(parseDateSearchValue),
            };
        case 'number':
            return {
                type: searchParam.type,
                name: searchParam.name,
                searchParam,
                parsedSearchValues: orSearchValues.map(parseNumberSearchValue),
            };
        case 'quantity':
            return {
                type: searchParam.type,
                name: searchParam.name,
                searchParam,
                parsedSearchValues: orSearchValues.map(parseQuantitySearchValue),
            };
        case 'reference':
            return {
                type: searchParam.type,
                name: searchParam.name,
                searchParam,
                parsedSearchValues: orSearchValues.map(parseStringLikeSearchValue),
            };
        case 'string':
            return {
                type: searchParam.type,
                name: searchParam.name,
                searchParam,
                parsedSearchValues: orSearchValues.map(parseStringLikeSearchValue),
            };
        case 'composite':
            // composite is not supported at this time and we just treat them as string params
            return {
                type: searchParam.type,
                name: searchParam.name,
                searchParam,
                parsedSearchValues: orSearchValues.map(parseStringLikeSearchValue),
            };
        case 'special':
            // special is not supported at this time and we just treat them as string params
            return {
                type: searchParam.type,
                name: searchParam.name,
                searchParam,
                parsedSearchValues: orSearchValues.map(parseStringLikeSearchValue),
            };
        case 'token':
            return {
                type: searchParam.type,
                name: searchParam.name,
                searchParam,
                parsedSearchValues: orSearchValues.map(parseTokenSearchValue),
            };
        case 'uri':
            return {
                type: searchParam.type,
                name: searchParam.name,
                searchParam,
                parsedSearchValues: orSearchValues.map(parseStringLikeSearchValue),
            };
        default:
            // eslint-disable-next-line no-case-declarations
            const exhaustiveCheck: never = searchParam.type;
            return exhaustiveCheck;
    }
};

/**
 * Parse and validate the search query parameters. This method ignores _include, _revinclude, _sort, and chained parameters
 * @param fhirSearchParametersRegistry - instance of FHIRSearchParametersRegistry
 * @param resourceType - FHIR resource type used as base in the search request
 * @param queryParams - search request query params object. It is expected to have the shape used by https://www.npmjs.com/package/qs
 */
export const parseQuery = (
    fhirSearchParametersRegistry: FHIRSearchParametersRegistry,
    resourceType: string,
    queryParams: any,
): ParsedFhirQueryParams => {
    const normalizedQueryParams: { [name: string]: string[] } = normalizeQueryParams(queryParams);

    const searchableParams: [string, string[]][] = Object.entries(normalizedQueryParams).filter(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        ([searchParameter, value]) =>
            !NON_SEARCHABLE_PARAMETERS.includes(searchParameter) && !isChainedParameter(searchParameter),
    );

    const parsedParams = searchableParams.flatMap(([searchParameter, searchValues]) => {
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
        return searchValues.map((searchValue) => {
            const parsedQueryParam = parseSearchQueryParam(fhirSearchParam, searchValue);
            parsedQueryParam.modifier = searchModifier.modifier;
            return parsedQueryParam;
        });
    });

    return {
        resourceType,
        searchParams: parsedParams,
        hasUnsearchableParams: size(normalizedQueryParams) > searchableParams.length,
    };
};
