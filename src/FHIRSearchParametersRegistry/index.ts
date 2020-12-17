/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { FhirVersion } from 'fhir-works-on-aws-interface';
import compiledSearchParamsV4 from '../schema/compiledSearchParameters.4.0.1.json';
import compiledSearchParamsV3 from '../schema/compiledSearchParameters.3.0.1.json';

export type SearchParam = {
    type: string;
    description: string;
    target?: string[];
    compiled: { resourceType: string; path: string; condition?: string[] }[];
};
export type CompiledSearchParams = {
    [resourceType: string]: {
        [name: string]: SearchParam;
    };
};

/**
 * This class is the single authority over the supported FHIR SearchParameters and their definitions
 */
// eslint-disable-next-line import/prefer-default-export
export class FHIRSearchParametersRegistry {
    private readonly compiledSearchParams: CompiledSearchParams;

    constructor(fhirVersion: FhirVersion) {
        if (fhirVersion === '4.0.1') {
            this.compiledSearchParams = compiledSearchParamsV4 as any;
        } else {
            this.compiledSearchParams = compiledSearchParamsV3 as any;
        }
    }

    /**
     * Retrieve a search parameter. Returns undefined if the parameter is not found on the registry.
     * @param resourceType FHIR resource type
     * @param name search parameter name
     */
    getSearchParameter(resourceType: string, name: string): SearchParam? {
        return this.compiledSearchParams?.[resourceType]?.[name];
    }
}
