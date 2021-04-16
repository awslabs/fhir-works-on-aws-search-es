/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { InvalidSearchParameterError } from 'fhir-works-on-aws-interface';
import { CompiledSearchParam } from '../../FHIRSearchParametersRegistry';
import { parseNumber } from './common/number';
import { prefixRangeNumber } from './common/prefixRange';

interface NumberSearchParameter {
    prefix: string;
    number: number;
    implicitRange: {
        start: number;
        end: number;
    };
}

const NUMBER_SEARCH_PARAM_REGEX = /^(?<prefix>eq|ne|lt|gt|ge|le|sa|eb|ap)?(?<numberString>[\d.+-eE]+)$/;

export const parseNumberSearchParam = (param: string): NumberSearchParameter => {
    const match = param.match(NUMBER_SEARCH_PARAM_REGEX);
    if (match === null) {
        throw new InvalidSearchParameterError(`Invalid number search parameter: ${param}`);
    }

    const { numberString } = match.groups!;

    // If no prefix is present, the prefix eq is assumed.
    // https://www.hl7.org/fhir/search.html#prefix
    const prefix = match.groups!.prefix ?? 'eq';

    const fhirNumber = parseNumber(numberString);
    return {
        prefix,
        ...fhirNumber,
    };
};

export const numberQuery = (compiledSearchParam: CompiledSearchParam, value: string): any => {
    const { prefix, implicitRange, number } = parseNumberSearchParam(value);
    return prefixRangeNumber(prefix, number, implicitRange, compiledSearchParam.path);
};
