/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { InvalidSearchParameterError } from 'fhir-works-on-aws-interface';
import { CompiledSearchParam } from '../../FHIRSearchParametersRegistry';
import { prefixRangeNumber } from './common/prefixRange';
import { NumberSearchValue } from '../../FhirQueryParser';

const SUPPORTED_MODIFIERS: string[] = [];

// eslint-disable-next-line import/prefer-default-export
export const numberQuery = (
    compiledSearchParam: CompiledSearchParam,
    value: NumberSearchValue,
    modifier?: string,
): any => {
    if (modifier && !SUPPORTED_MODIFIERS.includes(modifier)) {
        throw new InvalidSearchParameterError(`Unsupported number search modifier: ${modifier}`);
    }
    const { prefix, implicitRange, number } = value;
    return prefixRangeNumber(prefix, number, implicitRange, compiledSearchParam.path);
};
