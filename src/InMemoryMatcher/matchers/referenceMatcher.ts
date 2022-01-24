/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 *
 */

import { ReferenceSearchValue } from '../../FhirQueryParser/typeParsers/referenceParser';

// eslint-disable-next-line import/prefer-default-export
export const referenceMatch = (
    searchValue: ReferenceSearchValue,
    resourceValue: any,
    { baseUrl, target = [] }: { baseUrl?: string; target?: string[] },
): boolean => {
    const reference = resourceValue?.reference;

    switch (searchValue.referenceType) {
        case 'idOnly':
            return target.some(
                (targetType) =>
                    (baseUrl !== undefined && `${baseUrl}/${targetType}/${searchValue.id}` === reference) ||
                    `${targetType}/${searchValue.id}` === reference,
            );
        case 'relative':
            return (
                (baseUrl !== undefined && `${baseUrl}/${searchValue.resourceType}/${searchValue.id}` === reference) ||
                `${searchValue.resourceType}/${searchValue.id}` === reference
            );
        case 'url':
            return (
                `${searchValue.fhirServiceBaseUrl}/${searchValue.resourceType}/${searchValue.id}` === reference ||
                (baseUrl !== undefined &&
                    searchValue.fhirServiceBaseUrl === baseUrl &&
                    `${searchValue.resourceType}/${searchValue.id}` === reference)
            );
        case 'unparseable':
            return reference === searchValue.rawValue;
        default:
            // eslint-disable-next-line no-case-declarations
            const exhaustiveCheck: never = searchValue;
            return exhaustiveCheck;
    }
};
