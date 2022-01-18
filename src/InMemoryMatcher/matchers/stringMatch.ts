/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 *
 */

import { StringLikeSearchValue } from '../../FhirQueryParser';
import { CompiledSearchParam } from '../../FHIRSearchParametersRegistry';

// eslint-disable-next-line import/prefer-default-export
export const stringMatch = (
    compiledSearchParam: CompiledSearchParam,
    value: StringLikeSearchValue,
    resourceValue: any,
): boolean => {
    if (compiledSearchParam.path === 'name') {
        // name is a special parameter.
        const nameFields = [
            resourceValue?.family,
            resourceValue?.given,
            resourceValue?.text,
            resourceValue?.prefix,
            resourceValue?.suffix,
        ];

        return nameFields.some((f) => f === value);
    }

    if (compiledSearchParam.path === 'address') {
        // address is a special parameter.
        const addressFields = [
            resourceValue?.city,
            resourceValue?.country,
            resourceValue?.district,
            resourceValue?.line,
            resourceValue?.postalCode,
            resourceValue?.state,
            resourceValue?.text,
        ];

        return addressFields.some((f) => f === value);
    }

    return value === resourceValue;
};
