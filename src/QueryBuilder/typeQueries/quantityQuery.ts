/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { isEmpty } from 'lodash';
import { InvalidSearchParameterError } from 'fhir-works-on-aws-interface';
import { CompiledSearchParam } from '../../FHIRSearchParametersRegistry';
import { parseNumber } from './common/number';
import { prefixRangeNumber } from './common/prefixRange';

interface QuantitySearchParameter {
    prefix: string;
    system: string;
    code: string;
    number: number;
    implicitRange: {
        start: number;
        end: number;
    };
}

const QUANTITY_SEARCH_PARAM_REGEX = /^(?<prefix>eq|ne|lt|gt|ge|le|sa|eb|ap)?(?<numberString>[\d.+-eE]+)(\|(?<system>[^|\s]*)\|(?<code>[^|\s]*))?$/;

export const parseQuantitySearchParam = (param: string): QuantitySearchParameter => {
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

export const quantityQuery = (
    compiledSearchParam: CompiledSearchParam,
    value: string,
    useKeywordSubFields: boolean,
    modifier?: string,
): any => {
    if (modifier === 'exact') {
        throw new InvalidSearchParameterError(`Invalid quantity search modifier: ${modifier}`);
    }
    const { prefix, implicitRange, number, system, code } = parseQuantitySearchParam(value);
    const queries = [prefixRangeNumber(prefix, number, implicitRange, `${compiledSearchParam.path}.value`)];
    const keywordSuffix = useKeywordSubFields ? '.keyword' : '';

    if (!isEmpty(system) && !isEmpty(code)) {
        queries.push({
            multi_match: {
                fields: [`${compiledSearchParam.path}.code${keywordSuffix}`],
                query: code,
                lenient: true,
            },
        });

        queries.push({
            multi_match: {
                fields: [`${compiledSearchParam.path}.system${keywordSuffix}`],
                query: system,
                lenient: true,
            },
        });
    } else if (!isEmpty(code)) {
        // when there is no system, search either the code (code) or the stated human unit (unit)
        // https://www.hl7.org/fhir/search.html#quantity
        queries.push({
            multi_match: {
                fields: [
                    `${compiledSearchParam.path}.code${keywordSuffix}`,
                    `${compiledSearchParam.path}.unit${keywordSuffix}`,
                ],
                query: code,
                lenient: true,
            },
        });
    }

    if (queries.length === 1) {
        return queries[0];
    }
    return {
        bool: {
            must: queries,
        },
    };
};
