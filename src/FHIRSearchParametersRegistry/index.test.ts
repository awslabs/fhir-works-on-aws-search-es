/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { FHIRSearchParametersRegistry } from './index';

describe('FHIRSearchParametersRegistry', () => {
    test('getCapabilities snapshot', () => {
        expect(new FHIRSearchParametersRegistry('4.0.1').getCapabilities()).toMatchSnapshot();
    });

    describe('Implementation Guides', () => {
        test('get search parameters added by IGs', () => {
            const IGCompiledSearchParams = [
                {
                    name: 'race',
                    url: 'http://hl7.org/fhir/us/core/SearchParameter/us-core-race',
                    type: 'token',
                    description: 'Returns patients with a race extension matching the specified code.',
                    base: 'Patient',
                    compiled: [
                        {
                            resourceType: 'Patient',
                            path: 'extension.extension.value.code',
                            condition: [
                                'extension.url',
                                '=',
                                'http://hl7.org/fhir/us/core/StructureDefinition/us-core-race',
                            ],
                        },
                    ],
                },
            ];

            const fhirSearchParametersRegistry = new FHIRSearchParametersRegistry('4.0.1', IGCompiledSearchParams);
            expect(fhirSearchParametersRegistry.getSearchParameter('Patient', 'race')).toMatchInlineSnapshot(`
                            Object {
                              "base": "Patient",
                              "compiled": Array [
                                Object {
                                  "condition": Array [
                                    "extension.url",
                                    "=",
                                    "http://hl7.org/fhir/us/core/StructureDefinition/us-core-race",
                                  ],
                                  "path": "extension.extension.value.code",
                                  "resourceType": "Patient",
                                },
                              ],
                              "description": "Returns patients with a race extension matching the specified code.",
                              "name": "race",
                              "type": "token",
                              "url": "http://hl7.org/fhir/us/core/SearchParameter/us-core-race",
                            }
                    `);
        });

        test('search parameters added by IGs show up in capability statement', () => {
            const IGCompiledSearchParams = [
                {
                    name: 'race',
                    url: 'http://hl7.org/fhir/us/core/SearchParameter/us-core-race',
                    type: 'token',
                    description: 'Returns patients with a race extension matching the specified code.',
                    base: 'Patient',
                    compiled: [
                        {
                            resourceType: 'Patient',
                            path: 'extension.extension.value.code',
                            condition: [
                                'extension.url',
                                '=',
                                'http://hl7.org/fhir/us/core/StructureDefinition/us-core-race',
                            ],
                        },
                    ],
                },
            ];

            const fhirSearchParametersRegistry = new FHIRSearchParametersRegistry('4.0.1', IGCompiledSearchParams);
            expect(fhirSearchParametersRegistry.getCapabilities().Patient.searchParam.find(x => x.name === 'race'))
                .toMatchInlineSnapshot(`
                Object {
                  "definition": "http://hl7.org/fhir/us/core/SearchParameter/us-core-race",
                  "documentation": "Returns patients with a race extension matching the specified code.",
                  "name": "race",
                  "type": "token",
                }
            `);
        });

        test('IGs search params should overwrite base FHIR search params', () => {
            const IGCompiledSearchParams = [
                {
                    name: 'given',
                    url: 'http://hl7.org/fhir/us/core/SearchParameter/us-core-patient-given',
                    type: 'string',
                    description: 'a long us core description',
                    base: 'Patient',
                    compiled: [
                        {
                            resourceType: 'Patient',
                            path: 'name.given',
                        },
                    ],
                },
            ];

            const fhirSearchParametersRegistry = new FHIRSearchParametersRegistry('4.0.1', IGCompiledSearchParams);
            expect(fhirSearchParametersRegistry.getSearchParameter('Patient', 'given')).toMatchInlineSnapshot(`
                Object {
                  "base": "Patient",
                  "compiled": Array [
                    Object {
                      "path": "name.given",
                      "resourceType": "Patient",
                    },
                  ],
                  "description": "a long us core description",
                  "name": "given",
                  "type": "string",
                  "url": "http://hl7.org/fhir/us/core/SearchParameter/us-core-patient-given",
                }
            `);
        });
    });
});
