/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */
import each from 'jest-each';
import { referenceQuery } from './referenceQuery';
import { FHIRSearchParametersRegistry } from '../../FHIRSearchParametersRegistry';

const fhirSearchParametersRegistry = new FHIRSearchParametersRegistry('4.0.1');
const organizationParam = fhirSearchParametersRegistry.getSearchParameter('Patient', 'organization')!.compiled[0];

describe('referenceQuery', () => {
    each([[true], [false]]).test('simple value; isESStaticallyTyped=%j', async (isESStaticallyTyped: boolean) => {
        const keywordSuffix = isESStaticallyTyped ? '' : '.keyword';
        expect(referenceQuery(organizationParam, 'Organization/111', isESStaticallyTyped)).toMatchInlineSnapshot(`
            Object {
              "multi_match": Object {
                "fields": Array [
                  "managingOrganization.reference${keywordSuffix}",
                ],
                "lenient": true,
                "query": "Organization/111",
              },
            }
        `);
    });
});
