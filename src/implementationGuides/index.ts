/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { ImplementationGuides } from 'fhir-works-on-aws-interface';
import * as nearley from 'nearley';
import grammar from './reducedFHIRPath';

/**
 * Based on the FHIR SearchParameter. This type only includes the fields that are required for the compile process.
 * See: https://www.hl7.org/fhir/searchparameter.html
 */
type FhirSearchParam = {
    resourceType: 'SearchParameter';
    url: string;
    name: string;
    description: string;
    base: string[];
    type: string;
    expression?: string;
    target?: string[];
};

const isFhirSearchParam = (x: any): x is FhirSearchParam => {
    return (
        typeof x === 'object' &&
        x &&
        x.resourceType === 'SearchParameter' &&
        typeof x.url === 'string' &&
        typeof x.name === 'string' &&
        typeof x.description === 'string' &&
        Array.isArray(x.base) &&
        x.base.every((y: any) => typeof y === 'string') &&
        typeof x.type === 'string' &&
        (x.expression === undefined || typeof x.expression === 'string') &&
        (x.target === undefined || (Array.isArray(x.target) && x.target.every((y: any) => typeof y === 'string')))
    );
};

const UNSUPPORTED_SEARCH_PARAMS = [
    'http://hl7.org/fhir/SearchParameter/Bundle-composition', // Uses "Bundle.entry[0]". We have no way of searching the nth element of an array
    'http://hl7.org/fhir/SearchParameter/Bundle-message', // Uses "Bundle.entry[0]". We have no way of searching the nth element of an array

    'http://hl7.org/fhir/SearchParameter/Patient-deceased', // Does not define a proper path "Patient.deceased.exists() and Patient.deceased != false"

    'http://hl7.org/fhir/SearchParameter/Organization-phonetic', // Requires custom code for phonetic matching
    'http://hl7.org/fhir/SearchParameter/individual-phonetic', // Requires custom code for phonetic matching
];

const isParamSupported = (searchParam: FhirSearchParam) => {
    if (UNSUPPORTED_SEARCH_PARAMS.includes(searchParam.url)) {
        return false;
    }

    if (!searchParam.expression) {
        console.warn(`search parameters without a FHIRPath expression are not supported. Skipping ${searchParam.url}`);
        return false;
    }

    if (searchParam.type === 'composite') {
        console.warn(`search parameters of type "composite" are not supported. Skipping ${searchParam.url}`);
        return false;
    }

    if (searchParam.type === 'special') {
        // requires custom code. i.e. Location.near is supposed to do a geospatial search.
        console.warn(`search parameters of type "special" are not supported. Skipping ${searchParam.url}`);
        return false;
    }
    return true;
};

/**
 * Compiles the contents of an Implementation Guide into an internal representation used to build Elasticsearch queries.
 *
 * @param searchParams - an array of FHIR SearchParameters. See: https://www.hl7.org/fhir/searchparameter.html
 */
const compile = async (searchParams: any[]): Promise<any> => {
    const validFhirSearchParams: FhirSearchParam[] = [];
    searchParams.forEach(s => {
        if (isFhirSearchParam(s)) {
            validFhirSearchParams.push(s);
        } else {
            throw new Error(`The following input is not a search parameter: ${JSON.stringify(s, null, 2)}`);
        }
    });

    const compiledSearchParams = validFhirSearchParams
        .filter(s => s.expression)
        .filter(isParamSupported)
        .map(searchParam => {
            const parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar));
            try {
                parser.feed(searchParam.expression!);
            } catch (e) {
                throw new Error(
                    `The FHIRPath expressions for the following search parameter could not be parsed:
${JSON.stringify(searchParam, null, 2)}
Either it is an invalid FHIRPath expression or it is using FHIRPath features not supported by this compiler.
Original error message was: ${e.message}`,
                );
            }
            return {
                ...searchParam,
                compiled: parser.results[0], // nearley returns an array of results. The array always has exactly one element for non ambiguous grammars
            };
        })
        .flatMap(searchParam => {
            return searchParam.base.map((base: any) => ({
                name: searchParam.name,
                url: searchParam.url,
                type: searchParam.type,
                description: searchParam.description,
                base,
                target: searchParam.target,
                compiled: searchParam.compiled.filter((x: any) => x.resourceType === base),
            }));
        });

    return compiledSearchParams;
};

// eslint-disable-next-line import/prefer-default-export
export const SearchImplementationGuides: ImplementationGuides = {
    compile,
};
