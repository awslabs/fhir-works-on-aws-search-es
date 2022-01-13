/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 *
 */

import { NumberSearchValue } from '../../FhirQueryParser';
import { compareNumberToRange } from './common/numericComparison';

// eslint-disable-next-line import/prefer-default-export
export const numberMatch = (value: NumberSearchValue, resourceValue: any): boolean => {
    const { prefix, implicitRange, number } = value;

    if (typeof resourceValue !== 'number') {
        return false;
    }

    if (prefix === 'eq' || prefix === 'ne') {
        return compareNumberToRange(prefix, implicitRange, resourceValue);
    }

    // When a comparison prefix in the set lgt, lt, ge, le, sa & eb is provided, the implicit precision of the number is ignored,
    // and they are treated as if they have arbitrarily high precision
    // https://www.hl7.org/fhir/search.html#number
    return compareNumberToRange(
        prefix,
        {
            start: number,
            end: number,
        },
        resourceValue,
    );
};
