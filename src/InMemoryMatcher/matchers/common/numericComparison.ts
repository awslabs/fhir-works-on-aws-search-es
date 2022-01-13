/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 *
 */

export interface Range {
    start: number;
    end: number;
}

export const compareNumberToRange = (prefix: string, searchParamRange: Range, resourceValue: number): boolean => {
    const { start, end } = searchParamRange;
    // See https://www.hl7.org/fhir/search.html#prefix
    switch (prefix) {
        case 'ne': // not equal
            return resourceValue < start || resourceValue > end;
        case 'eq': // equal
            return resourceValue >= start && resourceValue <= end;
        case 'lt': // less than
            return resourceValue < end;
        case 'le': // less or equal
            return resourceValue <= end;
        case 'gt': // greater than
            return resourceValue > start;
        case 'ge': // greater or equal
            return resourceValue >= start;
        case 'sa': // starts after
            return resourceValue > end;
        case 'eb': // ends before
            return resourceValue < start;
        case 'ap': // approximately
            // same as eq for now
            return resourceValue >= start && resourceValue <= end;
        default:
            // this should never happen
            throw new Error(`unknown search prefix: ${prefix}`);
    }
};

// See the interpretation of prefixes when applied to ranges: https://www.hl7.org/fhir/search.html#prefix. It can be counterintuitive at first
export const compareRanges = (prefix: string, searchParamRange: Range, resourceRange: Range): any => {
    const { start, end } = searchParamRange;
    const resourceStart = resourceRange.start;
    const resourceEnd = resourceRange.end;
    // See https://www.hl7.org/fhir/search.html#prefix
    switch (prefix) {
        case 'ne': // not equal
            return !(resourceStart >= start && resourceEnd <= end);
        case 'eq': // equal
            return resourceStart >= start && resourceEnd <= end;
        case 'lt': // less than
        case 'le': // less or equal
            return resourceStart <= end;
        case 'gt': // greater than
        case 'ge': // greater or equal
            return resourceEnd >= start;
        case 'sa': // starts after
            return resourceStart > end;
        case 'eb': // ends before
            return resourceEnd < start;
        case 'ap': // approximately
            return !(resourceStart > end) && !(resourceEnd < start);
        default:
            // this should never happen
            throw new Error(`unknown search prefix: ${prefix}`);
    }
};
