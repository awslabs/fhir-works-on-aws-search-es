/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { CompiledSearchParam } from '../../FHIRSearchParametersRegistry';

// eslint-disable-next-line import/prefer-default-export
export function referenceQuery(compiled: CompiledSearchParam, value: string, isESStaticallyTyped: boolean): any {
    const keywordSuffix = isESStaticallyTyped ? '' : '.keyword';

    const fields = [`${compiled.path}.reference${keywordSuffix}`];
    return {
        multi_match: {
            fields,
            query: value,
            lenient: true,
        },
    };
}
