/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 *
 */
import { SearchParam } from '../FHIRSearchParametersRegistry';
import { InvalidSearchParameterError } from 'fhir-works-on-aws-interface';

export const getSearchQueries = (searchValue: string, searchParam: SearchParam, typeQueryWithConditions: any) => {
    // split search value string based on commas for OR functionality unless escaped by \
    let splitSearchValue : string[] = [];
    let lastIndex = 0;
    for (let c = 0; c < searchValue.length; c++) {
        if (searchValue[c] === '\\') {
            if (c + 1 < searchValue.length && searchValue[c+1] === ',') {
                // replace the escape character to allow the string to be handled by ES
                searchValue = searchValue.substring(0, c) + searchValue.substring(c+1);
            }
        } else if (searchValue[c] === ',') {
            splitSearchValue.push(searchValue.substring(lastIndex, c));
            lastIndex = c + 1;
        }
    }
    splitSearchValue.push(searchValue.substring(lastIndex));
    // construct queries for each split search value
    let queryList = [];
    for (let i = 0; i < splitSearchValue.length; i++) {
        queryList.push(searchParam.compiled.map(compiled => {
            return typeQueryWithConditions(searchParam, compiled, splitSearchValue[i]);
        }));
    }
    // join queries
    queryList.join();
    return queryList;
}