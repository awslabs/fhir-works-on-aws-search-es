/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { referenceQuery } from './referenceQuery';
import { FHIRSearchParametersRegistry } from '../../FHIRSearchParametersRegistry';

const fhirSearchParametersRegistry = new FHIRSearchParametersRegistry('4.0.1');
const organizationParam = fhirSearchParametersRegistry.getSearchParameter('Patient', 'organization')!.compiled[0];

describe('referenceQuery', () => {
    test('simple value', () => {
        expect(referenceQuery(organizationParam, 'Organization/111')).toMatchInlineSnapshot(`
            Object {
              "multi_match": Object {
                "fields": Array [
                  "managingOrganization.reference.keyword",
                ],
                "lenient": true,
                "query": "Organization/111",
              },
            }
        `);
    });
});
