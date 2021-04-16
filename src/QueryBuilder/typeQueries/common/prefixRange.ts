/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { InvalidSearchParameterError } from 'fhir-works-on-aws-interface';

interface Range {
    start: Date | number;
    end: Date | number;
}

interface NumberRange {
    start: number;
    end: number;
}

interface DateRange {
    start: Date;
    end: Date;
}

const prefixRange = (prefix: string, range: Range, path: string): any => {
    const { start, end } = range;

    // not equal
    if (prefix === 'ne') {
        return {
            bool: {
                should: [
                    {
                        range: {
                            [path]: {
                                gt: end,
                            },
                        },
                    },
                    {
                        range: {
                            [path]: {
                                lt: start,
                            },
                        },
                    },
                ],
            },
        };
    }

    // See https://www.hl7.org/fhir/search.html#prefix
    let elasticSearchRange;
    switch (prefix) {
        case 'eq': // equal
            elasticSearchRange = {
                gte: start,
                lte: end,
            };
            break;
        case 'lt': // less than
            elasticSearchRange = {
                lt: end,
            };
            break;
        case 'le': // less or equal
            elasticSearchRange = {
                lte: end,
            };
            break;
        case 'gt': // greater than
            elasticSearchRange = {
                gt: start,
            };
            break;
        case 'ge': // greater or equal
            elasticSearchRange = {
                gte: start,
            };
            break;
        case 'sa': // starts after
            elasticSearchRange = {
                gt: end,
            };
            break;
        case 'eb': // ends before
            elasticSearchRange = {
                lt: start,
            };
            break;
        case 'ap': // approximately
            throw new InvalidSearchParameterError('Unsupported prefix: ap');
        default:
            // this should never happen
            throw new Error(`unknown search prefix: ${prefix}`);
    }
    return {
        range: {
            [path]: elasticSearchRange,
        },
    };
};
export const prefixRangeNumber = (prefix: string, number: number, implicitRange: NumberRange, path: string): any => {
    if (prefix === 'eq' || prefix === 'ne') {
        return prefixRange(prefix, implicitRange, path);
    }
    // When a comparison prefix in the set lgt, lt, ge, le, sa & eb is provided, the implicit precision of the number is ignored,
    // and they are treated as if they have arbitrarily high precision
    // https://www.hl7.org/fhir/search.html#number
    return prefixRange(
        prefix,
        {
            start: number,
            end: number,
        },
        path,
    );
};

export const prefixRangeDate = (prefix: string, range: DateRange, path: string): any => {
    return prefixRange(prefix, range, path);
};
