/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { CompiledSearchParam } from '../../FHIRSearchParametersRegistry';

const escapeQueryString = (string: string) => {
    return string.replace(/\//g, '\\/');
};

// eslint-disable-next-line import/prefer-default-export
export function stringQuery(compiled: CompiledSearchParam, value: string): any {
    const fields = [compiled.path, `${compiled.path}.*`];
    return {
        multi_match: {
            fields,
            query: escapeQueryString(value),
            lenient: true,
        },
    };
}
