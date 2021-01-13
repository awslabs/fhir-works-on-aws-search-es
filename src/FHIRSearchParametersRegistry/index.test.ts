/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { FHIRSearchParametersRegistry } from './index';

describe('FHIRSearchParametersRegistry', () => {
    test('getCapabilities snapshot', () => {
        expect(new FHIRSearchParametersRegistry('4.0.1').getCapabilities()).toMatchSnapshot();
    });
});
