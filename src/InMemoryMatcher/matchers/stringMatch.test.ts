/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 *
 */

import { stringMatch } from './stringMatch';
import { CompiledSearchParam } from '../../FHIRSearchParametersRegistry';

const COMPILED_SEARCH_PARAM: CompiledSearchParam = { path: 'someField', resourceType: 'someResource' };

describe('stringMatch', () => {
    test('matches string', () => {
        expect(stringMatch(COMPILED_SEARCH_PARAM, 'hello', 'hello')).toBe(true);
        expect(stringMatch(COMPILED_SEARCH_PARAM, 'hello', 'something else')).toBe(false);
    });

    test('not a string', () => {
        expect(stringMatch(COMPILED_SEARCH_PARAM, 'hello', [])).toBe(false);
        expect(stringMatch(COMPILED_SEARCH_PARAM, 'hello', {})).toBe(false);
        expect(stringMatch(COMPILED_SEARCH_PARAM, 'hello', 23.1)).toBe(false);
    });

    describe('special cases', () => {
        describe('name', () => {
            test.each(['family', 'given', 'text', 'prefix', 'suffix'])('%p field', (field) => {
                const compiledNameParam = { path: 'name', resourceType: 'someResource' };
                expect(
                    stringMatch(compiledNameParam, 'John', {
                        [field]: 'John',
                    }),
                ).toBe(true);
            });
        });

        describe('address', () => {
            test.each(['city', 'country', 'district', 'line', 'postalCode', 'state', 'text'])('%p field', (field) => {
                const compiledNameParam = { path: 'address', resourceType: 'someResource' };
                expect(
                    stringMatch(compiledNameParam, 'somePlace', {
                        [field]: 'somePlace',
                    }),
                ).toBe(true);
            });
        });
    });
});
