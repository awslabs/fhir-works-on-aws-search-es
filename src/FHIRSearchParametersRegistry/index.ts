/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { FhirVersion } from 'fhir-works-on-aws-interface';
import compiledSearchParamsV4 from '../schema/compiledSearchParameters.4.0.1.json';
import compiledSearchParamsV3 from '../schema/compiledSearchParameters.3.0.1.json';

/**
 * name: SearchParameter name
 *
 * url: SearchParameter canonical url
 *
 * type: SearchParameter type
 *
 * description: SearchParameter description
 *
 * base: SearchParameter base resource type
 *
 * target: SearchParameter target. Only used for parameters with type reference
 *
 * compiled: array of objects that can be used to build ES queries. In most cases there is a single element in the array. Multiple elements in the array have on OR relationship between them
 *
 * compiled[].resourceType: FHIR resource type
 *
 * compiled[].path: object path to be used as field in queries
 *
 * compiled[].condition: a 3 element array with the elements of a condition [field, operator, value]
 *
 * @example
 * {
 *    "name": "depends-on",
 *    "url": "http://hl7.org/fhir/SearchParameter/ActivityDefinition-depends-on",
 *    "type": "reference",
 *    "description": "What resource is being referenced",
 *    "base": "ActivityDefinition",
 *    "target": [
 *      "Library",
 *      "Account",
 *      "ActivityDefinition",
 *    ],
 *    "compiled": [
 *      {
 *        "resourceType": "ActivityDefinition",
 *        "path": "relatedArtifact.resource",
 *        "condition": ["relatedArtifact.type", "=", "depends-on"]
 *      },
 *      {"resourceType": "ActivityDefinition", "path": "library"}
 *    ]
 *  }
 *
 */
export type SearchParam = {
    name: string;
    url: string;
    type: 'composite' | 'date' | 'number' | 'quantity' | 'reference' | 'special' | 'string' | 'token' | 'uri';
    description: string;
    base: string;
    target?: string[];
    compiled: { resourceType: string; path: string; condition?: string[] }[];
};

/**
 * This class is the single authority over the supported FHIR SearchParameters and their definitions
 */
// eslint-disable-next-line import/prefer-default-export
export class FHIRSearchParametersRegistry {
    private readonly includeMap: {
        [resourceType: string]: SearchParam[];
    };

    private readonly revincludeMap: {
        [resourceType: string]: SearchParam[];
    };

    private readonly typeNameMap: {
        [resourceType: string]: {
            [name: string]: SearchParam;
        };
    };

    constructor(fhirVersion: FhirVersion) {
        let compiledSearchParams: SearchParam[];
        if (fhirVersion === '4.0.1') {
            compiledSearchParams = compiledSearchParamsV4 as SearchParam[];
        } else {
            compiledSearchParams = compiledSearchParamsV3 as SearchParam[];
        }

        this.includeMap = {};
        this.revincludeMap = {};
        this.typeNameMap = {};

        compiledSearchParams.forEach(searchParam => {
            this.typeNameMap[searchParam.base] = this.typeNameMap[searchParam.base] ?? {};
            this.typeNameMap[searchParam.base][searchParam.name] = searchParam;

            if (searchParam.type === 'reference') {
                this.includeMap[searchParam.base] = this.includeMap[searchParam.base] ?? [];
                this.includeMap[searchParam.base].push(searchParam);

                // eslint-disable-next-line no-unused-expressions
                searchParam.target?.forEach(target => {
                    this.revincludeMap[target] = this.revincludeMap[target] ?? [];
                    this.revincludeMap[target].push(searchParam);
                });
            }
        });
    }

    /**
     * Retrieve a search parameter. Returns undefined if the parameter is not found on the registry.
     * @param resourceType FHIR resource type
     * @param name search parameter name
     * @return the matching SearchParam or undefined if there's no match
     */
    getSearchParameter(resourceType: string, name: string): SearchParam | undefined {
        return this.typeNameMap?.[resourceType]?.[name] || this.typeNameMap?.['Resource']?.[name];
    }

    /**
     * Retrieve a search parameter of type "reference"
     * @param resourceType
     * @param name
     * @param targetResourceType
     * @return the matching SearchParam or undefined if there's no match
     */
    getReferenceSearchParameter(
        resourceType: string,
        name: string,
        targetResourceType?: string,
    ): SearchParam | undefined {
        const searchParam = this.getSearchParameter(resourceType, name);

        if (searchParam === undefined) {
            return undefined;
        }

        if (searchParam.type !== 'reference') {
            return undefined;
        }

        if (targetResourceType !== undefined && !searchParam.target?.includes(targetResourceType)) {
            return undefined;
        }
        return searchParam;
    }

    /**
     * Retrieve all the SearchParams that can be used in _include queries for a given resource type
     * @param resourceType
     */
    getIncludeSearchParameters(resourceType: string): SearchParam[] {
        return this.includeMap[resourceType] ?? [];
    }

    /**
     * Retrieve all the SearchParams that can be used in _revinclude queries for a given resource type
     * @param resourceType
     */
    getRevIncludeSearchParameters(resourceType: string): SearchParam[] {
        return this.revincludeMap[resourceType] ?? [];
    }
}
