/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { InvalidSearchParameterError } from 'fhir-works-on-aws-interface';
import { referenceQuery } from './referenceQuery';
import { FHIRSearchParametersRegistry } from '../../FHIRSearchParametersRegistry';

const fhirSearchParametersRegistry = new FHIRSearchParametersRegistry('4.0.1');
const organizationParam = fhirSearchParametersRegistry.getSearchParameter('Patient', 'organization')!.compiled[0];

describe('referenceQuery', () => {
    test('simple value; with keyword', () => {
        expect(referenceQuery(organizationParam, 'Organization/111', true, 'organization', [])).toMatchInlineSnapshot(`
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
    test('simple value; without keyword', () => {
        expect(referenceQuery(organizationParam, 'http://fhir.com/baseR4/Organization/111', false, 'organization'))
            .toMatchInlineSnapshot(`
            Object {
              "multi_match": Object {
                "fields": Array [
                  "managingOrganization.reference",
                ],
                "lenient": true,
                "query": "http://fhir.com/baseR4/Organization/111",
              },
            }
        `);
    });
    test('just id search, one type found', () => {
        expect(referenceQuery(organizationParam, 'orgnaizationId', false, 'organization', ['Organization']))
            .toMatchInlineSnapshot(`
            Object {
              "multi_match": Object {
                "fields": Array [
                  "managingOrganization.reference",
                ],
                "lenient": true,
                "query": "Organization/orgnaizationId",
              },
            }
        `);
    });
    test('just id search, many types found', () => {
        expect(() =>
            referenceQuery(organizationParam, 'orgnaizationId', false, 'organization', ['Organization', 'Group']),
        ).toThrow(InvalidSearchParameterError);
    });
    test('just id search, no types found', () => {
        expect(() => referenceQuery(organizationParam, 'orgnaizationId', false, 'organization')).toThrow(
            InvalidSearchParameterError,
        );
    });
});
