/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 *
 */

export enum SearchModifier {
    None = 'none',
    Error = 'error',
    Exact = 'exact',
}

const getSearchModifiers = (searchParameter: string): SearchModifier => {
    const modifier = searchParameter.split(':');
    // split was unsuccessful, there is no modifier
    if (modifier.length === 1) {
        return SearchModifier.None;
    }
    switch (modifier[1]) {
        case SearchModifier.Exact:
            return SearchModifier.Exact;
        default:
            return SearchModifier.Error;
    }
};

export default getSearchModifiers;
