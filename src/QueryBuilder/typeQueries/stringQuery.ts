/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { InvalidSearchParameterError } from 'fhir-works-on-aws-interface';
import { CompiledSearchParam } from '../../FHIRSearchParametersRegistry';

const escapeQueryString = (string: string) => {
    return string.replace(/\//g, '\\/');
};

const SUPPORTED_MODIFIERS: string[] = ['exact'];

// eslint-disable-next-line import/prefer-default-export
export function stringQuery(compiled: CompiledSearchParam, value: string, modifier?: string): any {
    if (modifier && !SUPPORTED_MODIFIERS.includes(modifier)) {
        throw new InvalidSearchParameterError(`Unsupported string search modifier: ${modifier}`);
    }
    const keywordSuffix = modifier === 'exact' ? '.keyword' : '';
    const fields = [compiled.path + keywordSuffix, `${compiled.path}.*${keywordSuffix}`];

    return {
        multi_match: {
            fields,
            query: escapeQueryString(value),
            lenient: true,
        },
    };
}
