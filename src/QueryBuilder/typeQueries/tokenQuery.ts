/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { InvalidSearchParameterError } from 'fhir-works-on-aws-interface';
import { CompiledSearchParam } from '../../FHIRSearchParametersRegistry';

interface TokenSearchParameter {
    system?: string;
    code?: string;
    explicitNoSystemProperty: boolean;
}

// eslint-disable-next-line import/prefer-default-export
export const parseTokenSearchParam = (param: string): TokenSearchParameter => {
    if (param === '|') {
        throw new InvalidSearchParameterError(`Invalid token search parameter: ${param}`);
    }
    const parts = param.split('|');
    if (parts.length > 2) {
        throw new InvalidSearchParameterError(`Invalid token search parameter: ${param}`);
    }
    let system;
    let code;
    let explicitNoSystemProperty = false;
    if (parts.length === 1) {
        [code] = parts;
    } else {
        [system, code] = parts;
        if (system === '') {
            system = undefined;
            explicitNoSystemProperty = true;
        }
        if (code === '') {
            code = undefined;
        }
    }
    return { system, code, explicitNoSystemProperty };
};

export function tokenQuery(compiled: CompiledSearchParam, value: string): any {
    const { system, code, explicitNoSystemProperty } = parseTokenSearchParam(value);
    const queries = [];

    // Token search params are used for many different field types. Search is not aware of the types of the fields in FHIR resources.
    // The field type is specified in StructureDefinition, but not in SearchParameter.
    // We are doing a multi_match against all the applicable fields. non-existent fields are simply ignored.
    // Queries can be simplified if Search gets to know the field types from the StructureDefinitions.
    // See: https://www.hl7.org/fhir/search.html#token
    if (system !== undefined) {
        const fields = [
            `${compiled.path}.system.keyword`, // Coding, Identifier
            `${compiled.path}.coding.system.keyword`, // CodeableConcept
        ];

        queries.push({
            multi_match: {
                fields,
                query: system,
                lenient: true,
            },
        });
    }

    if (code !== undefined) {
        const fields = [
            `${compiled.path}.code.keyword`, // Coding
            `${compiled.path}.coding.code.keyword`, // CodeableConcept
            `${compiled.path}.value.keyword`, // Identifier
            `${compiled.path}.value`, // ContactPoint
            `${compiled.path}`, // code, boolean, uri, string
        ];

        queries.push({
            multi_match: {
                fields,
                query: code,
                lenient: true,
            },
        });
    }

    if (explicitNoSystemProperty) {
        queries.push({
            bool: {
                must_not: {
                    exists: {
                        field: `${compiled.path}.system`,
                    },
                },
            },
        });
    }

    if (queries.length === 1) {
        return queries[0];
    }

    return {
        bool: {
            must: queries,
        },
    };
}
