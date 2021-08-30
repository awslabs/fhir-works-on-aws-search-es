/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { InvalidSearchParameterError } from 'fhir-works-on-aws-interface';
import { CompiledSearchParam } from '../../FHIRSearchParametersRegistry';

// eslint-disable-next-line import/prefer-default-export
export function uriQuery(
    compiled: CompiledSearchParam,
    value: string,
    useKeywordSubFields: boolean,
    modifier?: string,
): any {
    if (modifier === 'exact') {
        throw new InvalidSearchParameterError(`Invalid uri search modifier: ${modifier}`);
    }
    const keywordSuffix = useKeywordSubFields ? '.keyword' : '';

    return {
        multi_match: {
            fields: [`${compiled.path}${keywordSuffix}`],
            query: value,
            lenient: true,
        },
    };
}
