/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { InvalidSearchParameterError } from 'fhir-works-on-aws-interface';
import { parseTokenSearchParam, tokenQuery } from './tokenQuery';
import { FHIRSearchParametersRegistry } from '../../FHIRSearchParametersRegistry';

const fhirSearchParametersRegistry = new FHIRSearchParametersRegistry('4.0.1');
const identifierParam = fhirSearchParametersRegistry.getSearchParameter('Patient', 'identifier')!.compiled[0];

describe('parseTokenSearchParam', () => {
    describe('valid inputs', () => {
        test('code', () => {
            expect(parseTokenSearchParam('code')).toMatchInlineSnapshot(`
                Object {
                  "code": "code",
                  "explicitNoSystemProperty": false,
                  "system": undefined,
                }
            `);
        });
        test('system|code', () => {
            expect(parseTokenSearchParam('system|code')).toMatchInlineSnapshot(`
                Object {
                  "code": "code",
                  "explicitNoSystemProperty": false,
                  "system": "system",
                }
            `);
        });
        test('|code', () => {
            expect(parseTokenSearchParam('|code')).toMatchInlineSnapshot(`
                Object {
                  "code": "code",
                  "explicitNoSystemProperty": true,
                  "system": undefined,
                }
            `);
        });
        test('system|', () => {
            expect(parseTokenSearchParam('system|')).toMatchInlineSnapshot(`
                Object {
                  "code": undefined,
                  "explicitNoSystemProperty": false,
                  "system": "system",
                }
            `);
        });
        test('http://acme.org/patient|2345', () => {
            expect(parseTokenSearchParam('http://acme.org/patient|2345')).toMatchInlineSnapshot(`
                Object {
                  "code": "2345",
                  "explicitNoSystemProperty": false,
                  "system": "http://acme.org/patient",
                }
            `);
        });
        test('empty string', () => {
            expect(parseTokenSearchParam('')).toMatchInlineSnapshot(`
                Object {
                  "code": "",
                  "explicitNoSystemProperty": false,
                  "system": undefined,
                }
            `);
        });
    });

    describe('invalid inputs', () => {
        // there are actually very few invalid inputs since almost any string can potentially be a code
        test('a|b|c', () => {
            expect(() => parseTokenSearchParam('a|b|c')).toThrow(InvalidSearchParameterError);
        });
        test('|', () => {
            expect(() => parseTokenSearchParam('|')).toThrow(InvalidSearchParameterError);
        });
    });
});

describe('tokenQuery', () => {
    test('system|code', () => {
        expect(tokenQuery(identifierParam, 'http://acme.org/patient|2345')).toMatchInlineSnapshot(`
            Object {
              "bool": Object {
                "must": Array [
                  Object {
                    "multi_match": Object {
                      "fields": Array [
                        "identifier.system.keyword",
                        "identifier.coding.system.keyword",
                      ],
                      "lenient": true,
                      "query": "http://acme.org/patient",
                    },
                  },
                  Object {
                    "multi_match": Object {
                      "fields": Array [
                        "identifier.code.keyword",
                        "identifier.coding.code.keyword",
                        "identifier.value.keyword",
                        "identifier",
                      ],
                      "lenient": true,
                      "query": "2345",
                    },
                  },
                ],
              },
            }
        `);
    });
    test('system|', () => {
        expect(tokenQuery(identifierParam, 'http://acme.org/patient')).toMatchInlineSnapshot(`
            Object {
              "multi_match": Object {
                "fields": Array [
                  "identifier.code.keyword",
                  "identifier.coding.code.keyword",
                  "identifier.value.keyword",
                  "identifier",
                ],
                "lenient": true,
                "query": "http://acme.org/patient",
              },
            }
        `);
    });
    test('|code', () => {
        expect(tokenQuery(identifierParam, '|2345')).toMatchInlineSnapshot(`
            Object {
              "bool": Object {
                "must": Array [
                  Object {
                    "multi_match": Object {
                      "fields": Array [
                        "identifier.code.keyword",
                        "identifier.coding.code.keyword",
                        "identifier.value.keyword",
                        "identifier",
                      ],
                      "lenient": true,
                      "query": "2345",
                    },
                  },
                  Object {
                    "bool": Object {
                      "must_not": Object {
                        "exists": Object {
                          "field": "identifier.system",
                        },
                      },
                    },
                  },
                ],
              },
            }
        `);
    });
    test('code', () => {
        expect(tokenQuery(identifierParam, 'http://acme.org/patient|2345')).toMatchInlineSnapshot(`
            Object {
              "bool": Object {
                "must": Array [
                  Object {
                    "multi_match": Object {
                      "fields": Array [
                        "identifier.system.keyword",
                        "identifier.coding.system.keyword",
                      ],
                      "lenient": true,
                      "query": "http://acme.org/patient",
                    },
                  },
                  Object {
                    "multi_match": Object {
                      "fields": Array [
                        "identifier.code.keyword",
                        "identifier.coding.code.keyword",
                        "identifier.value.keyword",
                        "identifier",
                      ],
                      "lenient": true,
                      "query": "2345",
                    },
                  },
                ],
              },
            }
        `);
    });
});
