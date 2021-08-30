/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { InvalidSearchParameterError } from 'fhir-works-on-aws-interface';
import parseSearchModifiers from './searchModifiers';

describe('getSearchModifiers', () => {
    test('name:exact', () => {
        expect(parseSearchModifiers('name:exact')).toMatchInlineSnapshot(`
        Object {
          "modifier": "exact",
          "parameterName": "name",
        }
        `);
    });

    test('name', () => {
        expect(parseSearchModifiers('name')).toMatchInlineSnapshot(`
            Object {
              "modifier": undefined,
              "parameterName": "name",
            }
        `);
    });

    test('name:contains', () => {
        expect(() => parseSearchModifiers('name:contains')).toThrow(InvalidSearchParameterError);
    });

    test('name:', () => {
        expect(() => parseSearchModifiers('name:')).toThrow(InvalidSearchParameterError);
    });
});
