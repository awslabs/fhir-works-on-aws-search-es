/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

export const DEFAULT_SEARCH_RESULTS_PER_PAGE = 20;

export const enum SEARCH_PAGINATION_PARAMS {
    PAGES_OFFSET = '_getpagesoffset',
    COUNT = '_count',
}

// Add here which requires date based search
export const DATE_FIELDS = [
    'birthDate',
    'effectiveDateTime',
    'date',
    'dueDate',
    'occurrenceDateTime',
    'manufactureDate',
    'expirationDate',
    'performedDateTime',
];

export const SEPARATOR: string = '_';

export const ITERATIVE_INCLUSION_PARAMETERS = ['_include:iterate', '_revinclude:iterate'];

export const NON_SEARCHABLE_PARAMETERS = [
    SEARCH_PAGINATION_PARAMS.PAGES_OFFSET,
    SEARCH_PAGINATION_PARAMS.COUNT,
    '_format',
    '_include',
    '_revinclude',
    ...ITERATIVE_INCLUSION_PARAMETERS,
];

export const ALLOWED_PREFIXES = ['eq', 'ne', 'gt', 'lt', 'ge', 'le', 'sa', 'eb', 'ap'];

export const enum PREFIXES {
    EQUAL = 'eq',
    NOT_EQUAL = 'ne',
    GREATER = 'gt',
    LESSER = 'lt',
    GREATER_OR_EQUAL = 'ge',
    LESSER_OR_EQUAL = 'le',
    STARTS_AFTER = 'sa', // These values need to be set appropriately
    ENDS_BEFORE = 'eb', // These values need to be set appropriately
    APPROXIMATION = 'ap', // These values need to be set appropriately
}

export const enum ES_OPERATORS {
    LESSER_OR_EQUAL = 'lte',
    GREATER_OR_EQUAL = 'gte',
    GREATER = 'gt',
    LESSER = 'lt',
}

export const enum TYPE_OF_QUERY {
    FILTER = 'FILTER',
    MUST = 'MUST',
    MUST_NOT = 'MUST_NOT',
}
