/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { CompiledSearchParam } from '../../FHIRSearchParametersRegistry';

const escapeQueryString = (string: string) => {
    return string.replace(/\//g, '\\/');
};

// eslint-disable-next-line import/prefer-default-export
export function stringQuery(compiled: CompiledSearchParam, value: string, useKeywordSubFields: boolean): any {
    const keywordSuffix = useKeywordSubFields ? '.keyword' : '';
    const fields = [compiled.path, `${compiled.path}${keywordSuffix}.*`];

    return {
        multi_match: {
            fields,
            query: escapeQueryString(value),
            lenient: true,
        },
    };
}
