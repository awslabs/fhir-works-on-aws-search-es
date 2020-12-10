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
export const DATEFIELDS = [
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
    NOTEQUAL = 'ne',
    GREATER = 'gt',
    LESSER = 'lt',
    GREATEROREQUAL = 'ge',
    LESSEROREQUAL = 'le',
    STARTSAFTER = 'sa', // These values need to be set appropriately
    ENDSBEFORE = 'eb', // These values need to be set appropriately
    APPROXIMATION = 'ap', // These values need to be set appropriately
}

export const enum ESOPERATORS {
    LESSEROREQUAL = 'lte',
    GREATEROREQUAL = 'gte',
    GREATER = 'gt',
    LESSER = 'lt',
}

export const enum TYPEOFQUERY {
    FILTER = 'FILTER',
    MUST = 'MUST',
    MUST_NOT = 'MUST_NOT',
}
