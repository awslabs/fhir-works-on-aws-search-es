/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 *
 */

import { InvalidSearchParameterError } from 'fhir-works-on-aws-interface';
import { parseNumber } from '../../QueryBuilder/typeQueries/common/number';

export interface QuantitySearchValue {
    prefix: string;
    system: string;
    code: string;
    number: number;
    implicitRange: {
        start: number;
        end: number;
    };
}

const QUANTITY_SEARCH_PARAM_REGEX =
    /^(?<prefix>eq|ne|lt|gt|ge|le|sa|eb|ap)?(?<numberString>[\d.+-eE]+)(\|(?<system>[^|\s]*)\|(?<code>[^|\s]*))?$/;
export const parseQuantitySearchValue = (param: string): QuantitySearchValue => {
    const match = param.match(QUANTITY_SEARCH_PARAM_REGEX);
    if (match === null) {
        throw new InvalidSearchParameterError(`Invalid quantity search parameter: ${param}`);
    }

    const { numberString, system = '', code = '' } = match.groups!;

    // If no prefix is present, the prefix eq is assumed.
    // https://www.hl7.org/fhir/search.html#prefix
    const prefix = match.groups!.prefix ?? 'eq';

    const fhirNumber = parseNumber(numberString);
    return {
        prefix,
        system,
        code,
        ...fhirNumber,
    };
};
