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

const SUPPORTED_MODIFIERS: string[] = [];

// Fields that do not have `.keyword` suffix; currently it is just `id`. This is only important if `useKeywordSubFields` is true
const FIELDS_WITHOUT_KEYWORD = ['id'];

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

export function tokenQuery(
    compiled: CompiledSearchParam,
    value: string,
    useKeywordSubFields: boolean,
    modifier?: string,
): any {
    if (modifier && !SUPPORTED_MODIFIERS.includes(modifier)) {
        throw new InvalidSearchParameterError(`Unsupported token search modifier: ${modifier}`);
    }
    const { system, code, explicitNoSystemProperty } = parseTokenSearchParam(value);
    const queries = [];
    const keywordSuffix = useKeywordSubFields && !FIELDS_WITHOUT_KEYWORD.includes(compiled.path) ? '.keyword' : '';

    // Token search params are used for many different field types. Search is not aware of the types of the fields in FHIR resources.
    // The field type is specified in StructureDefinition, but not in SearchParameter.
    // We are doing a multi_match against all the applicable fields. non-existent fields are simply ignored.
    // Queries can be simplified if Search gets to know the field types from the StructureDefinitions.
    // See: https://www.hl7.org/fhir/search.html#token
    if (system !== undefined) {
        const fields = [
            `${compiled.path}.system${keywordSuffix}`, // Coding, Identifier
            `${compiled.path}.coding.system${keywordSuffix}`, // CodeableConcept
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
            `${compiled.path}.code${keywordSuffix}`, // Coding
            `${compiled.path}.coding.code${keywordSuffix}`, // CodeableConcept
            `${compiled.path}.value${keywordSuffix}`, // Identifier, ContactPoint
            `${compiled.path}${keywordSuffix}`, // code, boolean, uri, string
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
