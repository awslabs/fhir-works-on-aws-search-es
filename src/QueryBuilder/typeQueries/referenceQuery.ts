/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { InvalidSearchParameterError } from 'fhir-works-on-aws-interface';
import { CompiledSearchParam } from '../../FHIRSearchParametersRegistry';
import { ReferenceSearchValue } from '../../FhirQueryParser/typeParsers/referenceParser';

const SUPPORTED_MODIFIERS: string[] = [];

// eslint-disable-next-line import/prefer-default-export
export function referenceQuery(
    compiled: CompiledSearchParam,
    value: ReferenceSearchValue,
    useKeywordSubFields: boolean,
    baseUrl: string,
    searchParamName: string,
    target: string[] = [],
    modifier?: string,
): any {
    if (modifier && !SUPPORTED_MODIFIERS.includes(modifier)) {
        throw new InvalidSearchParameterError(`Unsupported reference search modifier: ${modifier}`);
    }
    const keywordSuffix = useKeywordSubFields ? '.keyword' : '';

    const { id, fhirServiceBaseUrl, resourceType } = value;

    let references: string[] = [];

    if (resourceType) {
        if (fhirServiceBaseUrl) {
            if (fhirServiceBaseUrl === baseUrl) {
                references.push(`${resourceType}/${id}`);
            }
            references.push(`${fhirServiceBaseUrl}/${resourceType}/${id}`);
        } else {
            references.push(`${resourceType}/${id}`);
            references.push(`${baseUrl}/${resourceType}/${id}`);
        }
    }

    if (id && !resourceType && !fhirServiceBaseUrl) {
        references = target.flatMap((targetType: string) => {
            return [`${baseUrl}/${targetType}/${id}`, `${targetType}/${id}`];
        });
    }

    return { terms: { [`${compiled.path}.reference${keywordSuffix}`]: references } };
}
