/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 *
 */

import { InvalidSearchParameterError } from 'fhir-works-on-aws-interface';
import getComponentLogger from '../../loggerBuilder';

// export type ReferenceSearchValue = ReferenceSearchValueIdOnly | ReferenceSearchValueRelative | ReferenceSearchValueUrl;
export interface ReferenceSearchValue {
    id: string;
    resourceType?: string;
    fhirServiceBaseUrl?: string;
}

const logger = getComponentLogger();
const ID_ONLY_REGEX = /^[A-Za-z0-9\-.]{1,64}$/;
const FHIR_REFERENCE_REGEX =
    /^((?<fhirServiceBaseUrl>https?:\/\/[A-Za-z0-9\-\\.:%$_/]+)\/)?(?<resourceType>[A-Z][a-zA-Z]+)\/(?<id>[A-Za-z0-9\-.]{1,64})$/;

export const parseReferenceSearchValue = (
    { target, name }: { target?: string[]; name: string },
    param: string,
): ReferenceSearchValue => {
    const match = param.match(FHIR_REFERENCE_REGEX);
    if (match) {
        const { fhirServiceBaseUrl, resourceType, id } = match.groups!;
        if (fhirServiceBaseUrl) {
            return {
                id,
                resourceType,
                fhirServiceBaseUrl,
            };
        }
        if (!fhirServiceBaseUrl) {
            return {
                id,
                resourceType,
            };
        }
    }

    if (ID_ONLY_REGEX.test(param)) {
        if (target === undefined || target.length === 0) {
            logger.error(
                `ID only reference search failed. The requested search parameter: '${name}',  does not have any targets. Please ensure the compiled IG is valid`,
            );
            throw new InvalidSearchParameterError(
                `ID only search for '${name}' parameter is not supported, please specify the value with the format [resourceType]/[id] or as an absolute URL`,
            );
        }

        return {
            id: param,
        };
    }

    throw new InvalidSearchParameterError(`Invalid reference search parameter: ${param}`);
};
