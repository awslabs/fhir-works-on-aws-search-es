/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { InvalidSearchParameterError } from 'fhir-works-on-aws-interface';
import { CompiledSearchParam } from '../../FHIRSearchParametersRegistry';
import { prefixRangeDate } from './common/prefixRange';
import { DateSearchValue } from '../../FhirQueryParser';

const SUPPORTED_MODIFIERS: string[] = [];

// eslint-disable-next-line import/prefer-default-export
export const dateQuery = (compiledSearchParam: CompiledSearchParam, value: DateSearchValue, modifier?: string): any => {
    if (modifier && !SUPPORTED_MODIFIERS.includes(modifier)) {
        throw new InvalidSearchParameterError(`Unsupported date search modifier: ${modifier}`);
    }
    const { prefix, range } = value;
    return prefixRangeDate(prefix, range, compiledSearchParam.path);
};
