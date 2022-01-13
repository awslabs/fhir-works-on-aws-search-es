/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 *
 */

import { stringMatch } from './stringMatch';

describe('stringMatch', () => {
    test('matches string', () => {
        expect(stringMatch('hello', 'hello')).toBe(true);
        expect(stringMatch('hello', 'something else')).toBe(false);
    });

    test('not a string', () => {
        expect(stringMatch('hello', [])).toBe(false);
        expect(stringMatch('hello', {})).toBe(false);
        expect(stringMatch('hello', 23.1)).toBe(false);
    });
});
