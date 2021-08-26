/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import getSearchModifiers from './searchModifiers';

describe('getSearchModifiers', () => {
    test('name:', () => {
        expect(getSearchModifiers('name:')).toMatchInlineSnapshot(`"error"`);
    });

    test('name:exact', () => {
        expect(getSearchModifiers('name:exact')).toMatchInlineSnapshot(`"exact"`);
    });

    test('name:contains', () => {
        expect(getSearchModifiers('name:contains')).toMatchInlineSnapshot(`"error"`);
    });

    test('name', () => {
        expect(getSearchModifiers('name')).toMatchInlineSnapshot(`"none"`);
    });
});
