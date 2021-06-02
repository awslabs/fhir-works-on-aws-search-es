/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

export const DEFAULT_SEARCH_RESULTS_PER_PAGE = 20;

export const enum SEARCH_PAGINATION_PARAMS {
    PAGES_OFFSET = '_getpagesoffset',
    COUNT = '_count',
}

export const SEPARATOR: string = '_';
export const ITERATIVE_INCLUSION_PARAMETERS = ['_include:iterate', '_revinclude:iterate'];
export const SORT_PARAMETER = '_sort';
export const NON_SEARCHABLE_PARAMETERS = [
    SORT_PARAMETER,
    SEARCH_PAGINATION_PARAMS.PAGES_OFFSET,
    SEARCH_PAGINATION_PARAMS.COUNT,
    '_format',
    '_include',
    '_revinclude',
    ...ITERATIVE_INCLUSION_PARAMETERS,
];

export const MAX_ES_WINDOW_SIZE: number = 10000;
