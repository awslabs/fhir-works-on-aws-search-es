/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { InvalidSearchParameterError } from 'fhir-works-on-aws-interface';
import { CompiledSearchParam } from '../../FHIRSearchParametersRegistry';
import getComponentLogger from '../../loggerBuilder';

const logger = getComponentLogger();

const ID_ONLY_REGEX = /^[A-Za-z0-9\-.]{1,64}$/;
const FHIR_RESOURCE_REGEX = /^((?<hostname>https?:\/\/[A-Za-z0-9\-\\.:%$_/]+)\/)?(?<resourceType>[A-Z][a-zA-Z]+)\/(?<id>[A-Za-z0-9\-.]{1,64})$/;

const SUPPORTED_MODIFIERS: string[] = [];

// eslint-disable-next-line import/prefer-default-export
export function referenceQuery(
    compiled: CompiledSearchParam,
    value: string,
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

    // http://hl7.org/fhir/R4/search.html#reference
    // reference fields should be of `keyword` ES type: https://www.elastic.co/guide/en/elasticsearch/reference/current/keyword.html
    let references: string[] = [value];
    const match = value.match(FHIR_RESOURCE_REGEX);
    if (match) {
        const { hostname, resourceType, id } = match.groups!;
        if (hostname && hostname === baseUrl) {
            references.push(`${resourceType}/${id}`);
        } else if (!hostname) {
            // Search doesn't have a hostname
            references.push(`${baseUrl}/${resourceType}/${id}`);
        }
    } else if (ID_ONLY_REGEX.test(value)) {
        if (target.length === 0) {
            logger.error(
                `ID only reference search failed. The requested search parameter: '${searchParamName}',  does not have any targets. Please ensure the compiled IG is valid`,
            );
            throw new InvalidSearchParameterError(
                `ID only search for '${searchParamName}' parameter is not supported, please specify the value with the format [resourcetType]/[id] or as an absolute URL`,
            );
        }

        references = target.flatMap((targetType: string) => {
            return [`${baseUrl}/${targetType}/${value}`, `${targetType}/${value}`];
        });
    }

    return { terms: { [`${compiled.path}.reference${keywordSuffix}`]: references } };
}
