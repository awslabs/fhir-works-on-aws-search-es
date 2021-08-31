/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { stringQuery } from './stringQuery';
import { FHIRSearchParametersRegistry } from '../../FHIRSearchParametersRegistry';

const fhirSearchParametersRegistry = new FHIRSearchParametersRegistry('4.0.1');
const nameParam = fhirSearchParametersRegistry.getSearchParameter('Patient', 'name')!.compiled[0];

describe('stringQuery', () => {
    test('simple value', () => {
        expect(stringQuery(nameParam, 'Robert Bell')).toMatchInlineSnapshot(`
            Object {
              "multi_match": Object {
                "fields": Array [
                  "name",
                  "name.*",
                ],
                "lenient": true,
                "query": "Robert Bell",
              },
            }
        `);
    });
    test('simple value; with forward slash', () => {
        expect(stringQuery(nameParam, 'Robert/Bobby Bell')).toMatchInlineSnapshot(`
            Object {
              "multi_match": Object {
                "fields": Array [
                  "name",
                  "name.*",
                ],
                "lenient": true,
                "query": "Robert\\\\/Bobby Bell",
              },
            }
        `);
    });
    test('simple value; with backwards slash', () => {
        expect(stringQuery(nameParam, 'Robert\\Bobby Bell')).toMatchInlineSnapshot(`
            Object {
              "multi_match": Object {
                "fields": Array [
                  "name",
                  "name.*",
                ],
                "lenient": true,
                "query": "Robert\\\\Bobby Bell",
              },
            }
        `);
    });
    test('simple value; with characters', () => {
        expect(stringQuery(nameParam, '平仮名')).toMatchInlineSnapshot(`
            Object {
              "multi_match": Object {
                "fields": Array [
                  "name",
                  "name.*",
                ],
                "lenient": true,
                "query": "平仮名",
              },
            }
        `);
    });
    test('simple value with exact modifier', () => {
        expect(stringQuery(nameParam, 'Robert Bell', 'exact')).toMatchInlineSnapshot(`
          Object {
            "multi_match": Object {
              "fields": Array [
                "name.keyword",
                "name.*.keyword",
              ],
              "lenient": true,
              "query": "Robert Bell",
            },
          }
      `);
    });
    test('simple value with exact modifier and case differences', () => {
        expect(stringQuery(nameParam, 'RoBeRt BeLL', 'exact')).toMatchInlineSnapshot(`
          Object {
            "multi_match": Object {
              "fields": Array [
                "name.keyword",
                "name.*.keyword",
              ],
              "lenient": true,
              "query": "RoBeRt BeLL",
            },
          }
      `);
    });
});
