import each from 'jest-each';
import {
    inclusionParameterFromString,
    getInclusionParametersFromQueryParams,
    getReferencesFromResources,
    InclusionSearchParameter,
} from './searchInclusions';

describe('inclusionParameterFromString', () => {
    describe('invalid inclusion parameters', () => {
        each([
            ['some-invalid-param'],
            ['Patient'],
            ['Patient:'],
            ['Patient:bad-field,,$'],
            ['Patient:field:'],
            ['Patient:field:bad#'],
        ]).test('%s', (s: string) => {
            expect(inclusionParameterFromString(s)).toBeNull();
        });
    });
    describe('valid inclusion parameters', () => {
        test('optional target resource type missing', () => {
            const input = 'Patient:field';
            const expected = {
                isWildcard: false,
                sourceResource: 'Patient',
                searchParameter: 'field',
            };
            expect(inclusionParameterFromString(input)).toEqual(expected);
        });

        test('optional target resource type present', () => {
            const input = 'Patient:field:OtherResource';
            const expected = {
                isWildcard: false,
                sourceResource: 'Patient',
                searchParameter: 'field',
                targetResourceType: 'OtherResource',
            };
            expect(inclusionParameterFromString(input)).toEqual(expected);
        });

        test('wildcard', () => {
            const input = '*';
            const expected = {
                isWildcard: true,
            };
            expect(inclusionParameterFromString(input)).toEqual(expected);
        });
    });
});

describe('getInclusionParametersFromQueryParams', () => {
    test('No inclusion Params', () => {
        const queryParams = { someKey: 'someValue' };
        const expected: any[] = [];
        expect(getInclusionParametersFromQueryParams('_include', queryParams)).toEqual(expected);
    });
    test('string param', () => {
        const queryParams = { someKey: 'someValue', _include: 'Patient:someField' };
        const expected: InclusionSearchParameter[] = [
            {
                isWildcard: false,
                type: '_include',
                sourceResource: 'Patient',
                searchParameter: 'someField',
            },
        ];
        expect(getInclusionParametersFromQueryParams('_include', queryParams)).toEqual(expected);
    });
    test('array param', () => {
        const queryParams = { someKey: 'someValue', _include: ['Patient:someField', 'Practitioner:someField'] };
        const expected: InclusionSearchParameter[] = [
            {
                isWildcard: false,
                type: '_include',
                sourceResource: 'Patient',
                searchParameter: 'someField',
            },
            {
                isWildcard: false,
                type: '_include',
                sourceResource: 'Practitioner',
                searchParameter: 'someField',
            },
        ];
        expect(getInclusionParametersFromQueryParams('_include', queryParams)).toEqual(expected);
    });
});

describe('getReferencesFromResources', () => {
    test('Happy case', () => {
        const includeSearchParams: InclusionSearchParameter[] = [
            {
                isWildcard: false,
                type: '_include',
                searchParameter: 'someField',
                sourceResource: 'Patient',
                targetResourceType: '',
            },
            {
                isWildcard: false,
                type: '_include',
                searchParameter: 'anotherField',
                sourceResource: 'Patient',
                targetResourceType: '',
            },
        ];

        const resources: any[] = [
            {
                someField: {
                    reference: 'Practitioner/111',
                },
                anotherField: {
                    reference: 'Organization/222',
                },
            },
        ];

        const refs = getReferencesFromResources(includeSearchParams, resources, 'Patient');

        const expected = [
            { resourceType: 'Practitioner', id: '111' },
            { resourceType: 'Organization', id: '222' },
        ];
        expect(refs).toEqual(expected);
    });

    test('dedupes references', () => {
        const includeSearchParams: InclusionSearchParameter[] = [
            {
                isWildcard: false,
                type: '_include',
                searchParameter: 'someField',
                sourceResource: 'Patient',
                targetResourceType: '',
            },
            {
                isWildcard: false,
                type: '_include',
                searchParameter: 'anotherField',
                sourceResource: 'Patient',
                targetResourceType: '',
            },
        ];

        const resources: any[] = [
            {
                someField: {
                    reference: 'Practitioner/111',
                },
                anotherField: {
                    reference: 'Practitioner/111',
                },
            },
        ];

        const refs = getReferencesFromResources(includeSearchParams, resources, 'Patient');

        const expected = [{ resourceType: 'Practitioner', id: '111' }];
        expect(refs).toEqual(expected);
    });

    test('array of references', () => {
        const includeSearchParams: InclusionSearchParameter[] = [
            {
                isWildcard: false,
                type: '_include',
                searchParameter: 'someField',
                sourceResource: 'Patient',
                targetResourceType: '',
            },
        ];

        const resources: any[] = [
            {
                someField: [
                    {
                        reference: 'Practitioner/111',
                    },
                    {
                        reference: 'Organization/222',
                    },
                ],
            },
        ];

        const refs = getReferencesFromResources(includeSearchParams, resources, 'Patient');

        const expected = [
            { resourceType: 'Practitioner', id: '111' },
            { resourceType: 'Organization', id: '222' },
        ];
        expect(refs).toEqual(expected);
    });

    test('searchParameter with dot', () => {
        const includeSearchParams: InclusionSearchParameter[] = [
            {
                isWildcard: false,
                type: '_include',
                searchParameter: 'someField.nestedField',
                sourceResource: 'Patient',
                targetResourceType: '',
            },
        ];

        const resources: any[] = [
            {
                someField: {
                    nestedField: {
                        reference: 'Practitioner/111',
                    },
                },
            },
        ];

        const refs = getReferencesFromResources(includeSearchParams, resources, 'Patient');

        const expected = [{ resourceType: 'Practitioner', id: '111' }];
        expect(refs).toEqual(expected);
    });

    test('non-relative urls', () => {
        const includeSearchParams: InclusionSearchParameter[] = [
            {
                isWildcard: false,
                type: '_include',
                searchParameter: 'someField',
                sourceResource: 'Patient',
                targetResourceType: '',
            },
            {
                isWildcard: false,
                type: '_include',
                searchParameter: 'anotherField',
                sourceResource: 'Patient',
                targetResourceType: '',
            },
        ];

        const resources: any[] = [
            {
                someField: {
                    reference: 'https://some-fhir-server/Practitioner/111',
                },
                anotherField: {
                    reference: 'this-is-not-a-relative-url',
                },
            },
        ];

        const refs = getReferencesFromResources(includeSearchParams, resources, 'Patient');
        expect(refs).toEqual([]);
    });

    test('sourceResource not matching request resourceType', () => {
        const includeSearchParams: InclusionSearchParameter[] = [
            {
                isWildcard: false,
                type: '_include',
                searchParameter: 'someField',
                sourceResource: 'Device',
                targetResourceType: '',
            },
        ];

        const resources: any[] = [
            {
                someField: {
                    reference: 'Practitioner/111',
                },
            },
        ];

        const refs = getReferencesFromResources(includeSearchParams, resources, 'Patient');
        expect(refs).toEqual([]);
    });

    test('searchParameter path undefined in resource', () => {
        const includeSearchParams: InclusionSearchParameter[] = [
            {
                isWildcard: false,
                type: '_include',
                searchParameter: 'someFieldThatIsUndefined',
                sourceResource: 'Patient',
                targetResourceType: '',
            },
        ];

        const resources: any[] = [
            {
                someField: {
                    reference: 'Practitioner/111',
                },
            },
        ];

        const refs = getReferencesFromResources(includeSearchParams, resources, 'Patient');
        expect(refs).toEqual([]);
    });
});