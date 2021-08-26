/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { InvalidSearchParameterError } from 'fhir-works-on-aws-interface';
import { CompiledSearchParam } from '../../FHIRSearchParametersRegistry';

const idOnlyRegExp = /^[A-Za-z0-9\-.]{1,64}$/;

// eslint-disable-next-line import/prefer-default-export
export function referenceQuery(
    compiled: CompiledSearchParam,
    value: string,
    useKeywordSubFields: boolean,
    searchParamName: string,
    target: string[] = [],
): any {
    const keywordSuffix = useKeywordSubFields ? '.keyword' : '';

    // http://hl7.org/fhir/R4/search.html#reference
    // reference fields should be of `keyword` ES type: https://www.elastic.co/guide/en/elasticsearch/reference/current/keyword.html
    let references: string[] = [value];
    if (value.match(idOnlyRegExp)) {
        if (target.length === 0) {
            throw new InvalidSearchParameterError(
                `'${searchParamName}' is invalid please specify the reference value with the format [resourcetType]/[id] or as an absolute URL`,
            );
        }

        references = target.map((resourceType: string) => {
            return `${resourceType}/${value}`;
        });
    }

    return { terms: { [`${compiled.path}.reference${keywordSuffix}`]: references } };
}
