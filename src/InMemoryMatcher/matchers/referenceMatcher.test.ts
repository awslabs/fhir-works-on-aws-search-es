import { referenceMatch } from './referenceMatcher';
import { ReferenceSearchValue } from '../../FhirQueryParser/typeParsers/referenceParser';

describe('referenceMatch', () => {
    describe('relative', () => {
        test('relative reference in resource', () => {
            const searchValue: ReferenceSearchValue = { id: '111', referenceType: 'relative', resourceType: 'Patient' };
            const resourceValue = { reference: 'Patient/111' };
            expect(
                referenceMatch(searchValue, resourceValue, {
                    baseUrl: 'xxxx',
                    target: [],
                }),
            ).toBe(true);
        });

        test('matching full url in resource', () => {
            const searchValue: ReferenceSearchValue = { id: '111', referenceType: 'relative', resourceType: 'Patient' };
            const resourceValue = { reference: 'https://fwoa.com/Patient/111' };
            expect(
                referenceMatch(searchValue, resourceValue, {
                    baseUrl: 'https://fwoa.com',
                    target: [],
                }),
            ).toBe(true);
        });

        test('no match', () => {
            const searchValue: ReferenceSearchValue = { id: '111', referenceType: 'relative', resourceType: 'Patient' };
            const resourceValue = { reference: 'Patient/222' };
            expect(
                referenceMatch(searchValue, resourceValue, {
                    baseUrl: '',
                    target: [],
                }),
            ).toBe(false);
        });
    });

    describe('url', () => {
        test('relative reference in resource with matching baseUrl', () => {
            const searchValue: ReferenceSearchValue = {
                fhirServiceBaseUrl: 'https://fwoa.com',
                id: '111',
                referenceType: 'url',
                resourceType: 'Patient',
            };
            const resourceValue = { reference: 'Patient/111' };
            expect(
                referenceMatch(searchValue, resourceValue, {
                    baseUrl: 'https://fwoa.com',
                    target: [],
                }),
            ).toBe(true);
        });

        test('matching full url in resource', () => {
            const searchValue: ReferenceSearchValue = {
                fhirServiceBaseUrl: 'https://fwoa.com',
                id: '111',
                referenceType: 'url',
                resourceType: 'Patient',
            };
            const resourceValue = { reference: 'https://fwoa.com/Patient/111' };
            expect(
                referenceMatch(searchValue, resourceValue, {
                    baseUrl: 'xxxx',
                    target: [],
                }),
            ).toBe(true);
        });
    });

    describe('idOnly', () => {
        test('relative reference in resource', () => {
            const searchValue: ReferenceSearchValue = { id: '111', referenceType: 'idOnly' };
            const resourceValue = { reference: 'Patient/111' };
            expect(
                referenceMatch(searchValue, resourceValue, {
                    baseUrl: 'xxxx',
                    target: ['Patient'],
                }),
            ).toBe(true);
        });

        test('matching full url in resource', () => {
            const searchValue: ReferenceSearchValue = { id: '111', referenceType: 'idOnly' };
            const resourceValue = { reference: 'https://fwoa.com/Patient/111' };
            expect(
                referenceMatch(searchValue, resourceValue, {
                    baseUrl: 'https://fwoa.com',
                    target: ['Patient'],
                }),
            ).toBe(true);
        });
    });

    describe('unparseable', () => {
        test('matching raw search value', () => {
            const searchValue: ReferenceSearchValue = { rawValue: '@#$_someValue_$#@', referenceType: 'unparseable' };
            const resourceValue = { reference: '@#$_someValue_$#@' };
            expect(
                referenceMatch(searchValue, resourceValue, {
                    baseUrl: 'xxxx',
                    target: [],
                }),
            ).toBe(true);
        });
    });
});
