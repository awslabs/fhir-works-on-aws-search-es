import each from 'jest-each';
import {
    inclusionParameterFromString,
    getInclusionParametersFromQueryParams,
    getIncludeReferencesFromResources,
    getRevincludeReferencesFromResources,
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

describe('getIncludeReferencesFromResources', () => {
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
                resourceType: 'Patient',
                someField: {
                    reference: 'Practitioner/111',
                },
                anotherField: {
                    reference: 'Organization/222',
                },
            },
        ];

        const refs = getIncludeReferencesFromResources(includeSearchParams, resources);

        const expected = [
            { resourceType: 'Practitioner', id: '111' },
            { resourceType: 'Organization', id: '222' },
        ];
        expect(refs).toEqual(expected);
    });

    test('Mixed resource types', () => {
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
            {
                isWildcard: false,
                type: '_include',
                searchParameter: 'orgField',
                sourceResource: 'Organization',
                targetResourceType: '',
            },
        ];

        const resources: any[] = [
            {
                resourceType: 'Patient',
                someField: {
                    reference: 'Practitioner/111',
                },
                anotherField: {
                    reference: 'Organization/222',
                },
            },
            {
                resourceType: 'Organization',
                orgField: {
                    reference: 'Device/333',
                },
            },
        ];

        const refs = getIncludeReferencesFromResources(includeSearchParams, resources);

        const expected = [
            { resourceType: 'Practitioner', id: '111' },
            { resourceType: 'Organization', id: '222' },
            { resourceType: 'Device', id: '333' },
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
                resourceType: 'Patient',
                someField: {
                    reference: 'Practitioner/111',
                },
                anotherField: {
                    reference: 'Practitioner/111',
                },
            },
        ];

        const refs = getIncludeReferencesFromResources(includeSearchParams, resources);

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
                resourceType: 'Patient',
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

        const refs = getIncludeReferencesFromResources(includeSearchParams, resources);

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
                resourceType: 'Patient',
                someField: {
                    nestedField: {
                        reference: 'Practitioner/111',
                    },
                },
            },
        ];

        const refs = getIncludeReferencesFromResources(includeSearchParams, resources);

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
                resourceType: 'Patient',
                someField: {
                    reference: 'https://some-fhir-server/Practitioner/111',
                },
                anotherField: {
                    reference: 'this-is-not-a-relative-url',
                },
            },
        ];

        const refs = getIncludeReferencesFromResources(includeSearchParams, resources);
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
                resourceType: 'Patient',
                someField: {
                    reference: 'Practitioner/111',
                },
            },
        ];

        const refs = getIncludeReferencesFromResources(includeSearchParams, resources);
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
                resourceType: 'Patient',
                someField: {
                    reference: 'Practitioner/111',
                },
            },
        ];

        const refs = getIncludeReferencesFromResources(includeSearchParams, resources);
        expect(refs).toEqual([]);
    });
});

describe('getRevincludeReferencesFromResources', () => {
    test('happy case', () => {
        const revinclude: InclusionSearchParameter = {
            isWildcard: false,
            type: '_revinclude',
            searchParameter: 'someField',
            sourceResource: 'Device',
            targetResourceType: 'Patient',
        };
        const includeSearchParams: InclusionSearchParameter[] = [revinclude];

        const resources: any[] = [
            {
                resourceType: 'Patient',
                id: 'patient-id-111',
            },
            {
                resourceType: 'Organization',
                id: 'org-id-111',
            },
        ];

        const refs = getRevincludeReferencesFromResources(includeSearchParams, resources);

        expect(refs).toEqual([
            {
                references: ['Patient/patient-id-111'],
                revinclude,
            },
        ]);
    });

    test('undefined targetResourceType', () => {
        const revinclude: InclusionSearchParameter = {
            isWildcard: false,
            type: '_revinclude',
            searchParameter: 'someField',
            sourceResource: 'Device',
        };
        const includeSearchParams: InclusionSearchParameter[] = [revinclude];

        const resources: any[] = [
            {
                resourceType: 'Patient',
                id: 'patient-id-111',
            },
            {
                resourceType: 'Organization',
                id: 'org-id-111',
            },
        ];

        const refs = getRevincludeReferencesFromResources(includeSearchParams, resources);

        expect(refs).toEqual([
            {
                references: ['Patient/patient-id-111', 'Organization/org-id-111'],
                revinclude,
            },
        ]);
    });

    test('targetResourceType not matching any resource', () => {
        const revinclude: InclusionSearchParameter = {
            isWildcard: false,
            type: '_revinclude',
            searchParameter: 'someField',
            sourceResource: 'Device',
            targetResourceType: 'SomeResourceType',
        };
        const includeSearchParams: InclusionSearchParameter[] = [revinclude];

        const resources: any[] = [
            {
                resourceType: 'Patient',
                id: 'patient-id-111',
            },
            {
                resourceType: 'Organization',
                id: 'org-id-111',
            },
        ];

        const refs = getRevincludeReferencesFromResources(includeSearchParams, resources);

        expect(refs).toEqual([]);
    });
});
