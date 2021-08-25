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

    const fields = [`${compiled.path}.reference${keywordSuffix}`];
    let reference = value;
    // http://hl7.org/fhir/R4/search.html#reference
    // to cover the use-case of someone searching as just an 'id' and this reference just has 1 target i.e. Observation.patient = 123
    if (value.match(idOnlyRegExp)) {
        if (target.length === 1) {
            reference = `${target[0]}/${value}`;
        } else {
            throw new InvalidSearchParameterError(
                `'${searchParamName}' is invalid please specify the resource type with the id`,
            );
        }
    }

    return {
        multi_match: {
            fields,
            query: reference,
            lenient: true,
        },
    };
}
