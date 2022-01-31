/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 *
 */

import { StringLikeSearchValue } from '../../FhirQueryParser';
import { CompiledSearchParam } from '../../FHIRSearchParametersRegistry';

const comparisons = {
    eq: (a: unknown, b: string) => typeof a === 'string' && a.split(/[ \-,.]/).includes(b), // simple approximation of the way OpenSearch matches text fields.
    exact: (a: unknown, b: string) => a === b,
    contains: (a: unknown, b: string) => typeof a === 'string' && a.includes(b),
};

function isUsableType(x: unknown): x is string | Record<string, unknown> {
    return x !== null && (typeof x === 'string' || typeof x === 'object');
}

// eslint-disable-next-line import/prefer-default-export
export const stringMatch = (
    compiledSearchParam: CompiledSearchParam,
    value: StringLikeSearchValue,
    resourceValue: unknown,
    modifier?: string,
): boolean => {
    if (!isUsableType(resourceValue)) {
        return false;
    }

    let op: (a: unknown, b: string) => boolean;

    switch (modifier) {
        case 'exact':
            op = comparisons.exact;
            break;
        case 'contains':
            op = comparisons.contains;
            break;
        case undefined:
            op = comparisons.eq;
            break;
        default:
            throw new Error(`The modifier ":${modifier}" is not supported`);
    }

    let valuesFromResource: unknown[] = [];

    if (typeof resourceValue === 'string') {
        valuesFromResource = [resourceValue];
    } else {
        if (compiledSearchParam.path === 'name') {
            // name is a special parameter.
            valuesFromResource = [
                resourceValue?.family,
                resourceValue?.given,
                resourceValue?.text,
                resourceValue?.prefix,
                resourceValue?.suffix,
            ];
        }

        if (compiledSearchParam.path === 'address') {
            // address is a special parameter.
            valuesFromResource = [
                resourceValue?.city,
                resourceValue?.country,
                resourceValue?.district,
                resourceValue?.line,
                resourceValue?.postalCode,
                resourceValue?.state,
                resourceValue?.text,
            ];
        }
    }

    return valuesFromResource.some((f) => op(f, value));
};
