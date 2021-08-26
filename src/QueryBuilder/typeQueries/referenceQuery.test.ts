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
              "terms": Object {
                "managingOrganization.reference.keyword": Array [
                  "Organization/111",
                ],
              },
            }
        `);
    });
    test('simple value; without keyword', () => {
        expect(referenceQuery(organizationParam, 'http://fhir.com/baseR4/Organization/111', false, 'organization'))
            .toMatchInlineSnapshot(`
            Object {
              "terms": Object {
                "managingOrganization.reference": Array [
                  "http://fhir.com/baseR4/Organization/111",
                ],
              },
            }
        `);
    });
    test('just id search, one type found', () => {
        expect(referenceQuery(organizationParam, 'organizationId', true, 'organization', ['Organization']))
            .toMatchInlineSnapshot(`
            Object {
              "terms": Object {
                "managingOrganization.reference.keyword": Array [
                  "Organization/organizationId",
                ],
              },
            }
        `);
    });
    test('just id search, many types found', () => {
        expect(referenceQuery(organizationParam, 'organizationId', true, 'organization', ['Organization', 'Group']))
            .toMatchInlineSnapshot(`
            Object {
              "terms": Object {
                "managingOrganization.reference.keyword": Array [
                  "Organization/organizationId",
                  "Group/organizationId",
                ],
              },
            }
    `);
    });
    test('just id search, no types found', () => {
        expect(() => referenceQuery(organizationParam, 'organizationId', false, 'organization')).toThrow(
            InvalidSearchParameterError,
        );
    });
});
