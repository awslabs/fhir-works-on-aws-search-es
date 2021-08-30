/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { InvalidSearchParameterError } from 'fhir-works-on-aws-interface';
import { CompiledSearchParam } from '../../FHIRSearchParametersRegistry';

// eslint-disable-next-line import/prefer-default-export
export function referenceQuery(
    compiled: CompiledSearchParam,
    value: string,
    useKeywordSubFields: boolean,
    modifier?: string,
): any {
    if (modifier === 'exact') {
        throw new InvalidSearchParameterError(`Invalid reference search modifier: ${modifier}`);
    }
    const keywordSuffix = useKeywordSubFields ? '.keyword' : '';

    const fields = [`${compiled.path}.reference${keywordSuffix}`];
    return {
        multi_match: {
            fields,
            query: value,
            lenient: true,
        },
    };
}
