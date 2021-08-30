/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 *
 */

const parseSearchModifiers = (
    searchParameter: string,
): {
    parameterName: string;
    modifier?: string;
} => {
    const modifier = searchParameter.split(':');
    // split was unsuccessful, there is no modifier
    if (modifier.length === 1) {
        return { parameterName: modifier[0], modifier: undefined };
    }
    modifier[1] = modifier[1].toLowerCase();
    return { parameterName: modifier[0], modifier: modifier[1] };
};

export default parseSearchModifiers;
