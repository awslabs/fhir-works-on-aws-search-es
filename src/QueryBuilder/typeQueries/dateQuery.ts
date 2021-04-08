/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import parseISO from 'date-fns/parseISO';
import isValid from 'date-fns/isValid';
import lastDayOfYear from 'date-fns/lastDayOfYear';
import lastDayOfMonth from 'date-fns/lastDayOfMonth';
import set from 'date-fns/set';
import { InvalidSearchParameterError } from 'fhir-works-on-aws-interface';
import { CompiledSearchParam } from '../../FHIRSearchParametersRegistry';

interface DateSearchParameter {
    prefix: string;
    range: {
        start: Date;
        end: Date;
    };
}

// The date parameter format is yyyy-mm-ddThh:mm:ss[Z|(+|-)hh:mm] (the standard XML format).
// https://www.hl7.org/fhir/search.html#date
const DATE_SEARCH_PARAM_REGEX = /^(?<prefix>eq|ne|lt|gt|ge|le|sa|eb|ap)?(?<inputDate>(?<year>\d{4})(?:-(?<month>\d{2})(?:-(?<day>\d{2})(?:T(?<hours>\d{2}):(?<minutes>\d{2})(?::(?<seconds>\d{2})(?<timeZone>Z|[+-](?:\d{2}:\d{2}))?)?)?)?)?)$/;

export const parseDateSearchParam = (param: string): DateSearchParameter => {
    const match = param.match(DATE_SEARCH_PARAM_REGEX);
    if (match === null) {
        throw new InvalidSearchParameterError(`Invalid date search parameter: ${param}`);
    }
    const { inputDate, month, day, minutes, seconds } = match.groups!;

    // If no prefix is present, the prefix eq is assumed.
    // https://www.hl7.org/fhir/search.html#prefix
    const prefix = match.groups!.prefix ?? 'eq';

    const parsedDate = parseISO(inputDate);
    if (!isValid(parsedDate)) {
        throw new InvalidSearchParameterError(`Invalid date format: ${inputDate}`);
    }

    // When the date parameter is not fully specified, matches against it are based on the behavior of intervals
    // https://www.hl7.org/fhir/search.html#date
    let endDate: Date;
    const timeEndOfDay = { hours: 23, minutes: 59, seconds: 59 };
    if (seconds !== undefined) {
        endDate = parsedDate; // date is fully specified
    } else if (minutes !== undefined) {
        endDate = set(parsedDate, { seconds: 59 });
    } else if (day !== undefined) {
        endDate = set(parsedDate, timeEndOfDay);
    } else if (month !== undefined) {
        endDate = set(lastDayOfMonth(parsedDate), timeEndOfDay);
    } else {
        endDate = set(lastDayOfYear(parsedDate), timeEndOfDay);
    }

    return {
        prefix,
        range: {
            start: parsedDate,
            end: endDate,
        },
    };
};

// eslint-disable-next-line import/prefer-default-export
export const dateQuery = (compiledSearchParam: CompiledSearchParam, value: string): any => {
    const { prefix, range } = parseDateSearchParam(value);
    const { start, end } = range;

    // See https://www.hl7.org/fhir/search.html#prefix
    if (prefix !== 'ne') {
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
                [compiledSearchParam.path]: elasticSearchRange,
            },
        };
    }

    // ne prefix is the only case that requires a bool query;
    const neQuery = {
        bool: {
            should: [
                {
                    range: {
                        [compiledSearchParam.path]: {
                            gt: end,
                        },
                    },
                },
                {
                    range: {
                        [compiledSearchParam.path]: {
                            lt: start,
                        },
                    },
                },
            ],
        },
    };

    return neQuery;
};
