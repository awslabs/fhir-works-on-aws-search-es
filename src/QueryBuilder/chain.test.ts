/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { InvalidSearchParameterError } from 'fhir-works-on-aws-interface';
import parseChainedParameters from './chain';
import { FHIRSearchParametersRegistry } from '../FHIRSearchParametersRegistry';

const fhirSearchParametersRegistry = new FHIRSearchParametersRegistry('4.0.1');

describe('parseChainedParameters', () => {
    test('valid chained parameters', () => {
        expect(
            parseChainedParameters(fhirSearchParametersRegistry, 'Patient', {
                'general-practitioner:PractitionerRole.organization.name': 'HL7',
            }),
        ).toMatchInlineSnapshot(`
            Array [
              Object {
                "chain": Array [
                  Object {
                    "resourceType": "Organization",
                    "searchParam": "name",
                  },
                  Object {
                    "resourceType": "PractitionerRole",
                    "searchParam": "organization",
                  },
                  Object {
                    "resourceType": "Patient",
                    "searchParam": "general-practitioner",
                  },
                ],
                "initialValue": Array [
                  "HL7",
                ],
              },
            ]
        `);

        expect(
            parseChainedParameters(fhirSearchParametersRegistry, 'Patient', {
                'link:Patient.birthdate': 'gt2021-10-01',
            }),
        ).toMatchInlineSnapshot(`
            Array [
              Object {
                "chain": Array [
                  Object {
                    "resourceType": "Patient",
                    "searchParam": "birthdate",
                  },
                  Object {
                    "resourceType": "Patient",
                    "searchParam": "link",
                  },
                ],
                "initialValue": Array [
                  "gt2021-10-01",
                ],
              },
            ]
        `);

        expect(
            parseChainedParameters(fhirSearchParametersRegistry, 'DocumentReference', {
                'patient.identifier': '2.16.840.1.113883.3.1579|8889154591540',
            }),
        ).toMatchInlineSnapshot(`
            Array [
              Object {
                "chain": Array [
                  Object {
                    "resourceType": "Patient",
                    "searchParam": "identifier",
                  },
                  Object {
                    "resourceType": "DocumentReference",
                    "searchParam": "patient",
                  },
                ],
                "initialValue": Array [
                  "2.16.840.1.113883.3.1579|8889154591540",
                ],
              },
            ]
        `);
    });

    test('invalid params', () => {
        expect(() =>
            parseChainedParameters(fhirSearchParametersRegistry, 'Patient', {
                'organization.location.name': 'Hawaii',
            }),
        ).toThrow(
            new InvalidSearchParameterError("Invalid search parameter 'location' for resource type Organization"),
        );

        expect(() =>
            parseChainedParameters(fhirSearchParametersRegistry, 'Patient', {
                'organization.address.name': 'Hawaii',
            }),
        ).toThrow(
            new InvalidSearchParameterError(
                "Chained search parameter 'address' for resource type Organization is not a reference.",
            ),
        );

        expect(() =>
            parseChainedParameters(fhirSearchParametersRegistry, 'Patient', {
                'link.name': 'five-O',
            }),
        ).toThrow(
            new InvalidSearchParameterError(
                "Chained search parameter 'link' for resource type Patient points to multiple resource types, please specify.",
            ),
        );
    });
});
