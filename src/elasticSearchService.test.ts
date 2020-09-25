/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import each from 'jest-each';
import { ElasticSearchService } from './elasticSearchService';
import { ElasticSearch } from './elasticSearch';

jest.mock('./elasticSearch');

const FILTER_RULES_FOR_ACTIVE_RESOURCES = [{ match: { someFieldThatTellsIfTheResourceIsActive: 'AVAILABLE' } }];
const ALLOWED_RESOURCE_TYPES = [
    'Claim',
    'Communication',
    'ImmunizationRecommendation',
    'MedicationAdministration',
    'MedicationRequest',
    'MedicationStatement',
    'Organization',
    'Patient',
    'Practitioner',
    'PractitionerRole',
    'Provenance',
];

describe('typeSearch', () => {
    beforeEach(() => {
        jest.resetAllMocks();
    });
    describe('query snapshots for simple queryParams', () => {
        each([
            [{}],
            [{ _count: 10, _getpagesoffset: 2 }],
            [{ gender: 'female', name: 'Emily' }],
            [{ id: '11111111-1111-1111-1111-111111111111' }],
            [{ _format: 'json' }],
            [
                {
                    _count: 10,
                    _getpagesoffset: 2,
                    id: '11111111-1111-1111-1111-111111111111',
                    gender: 'female',
                    name: 'Emily',
                    _format: 'json',
                },
            ],
        ]).test('queryParams=%j', async (queryParams: any) => {
            const fakeSearchResult = {
                body: {
                    hits: {
                        total: {
                            value: 1,
                            relation: 'eq',
                        },
                        max_score: 1,
                        hits: [
                            {
                                _index: 'patient',
                                _type: '_doc',
                                _id: 'ab69afd3-39ed-42c3-9f77-8a718a247742_1',
                                _score: 1,
                                _source: {
                                    vid: '1',
                                    id: 'ab69afd3-39ed-42c3-9f77-8a718a247742',
                                    resourceType: 'Patient',
                                },
                            },
                        ],
                    },
                },
            };
            (ElasticSearch.search as jest.Mock).mockResolvedValue(fakeSearchResult);
            const es = new ElasticSearchService(FILTER_RULES_FOR_ACTIVE_RESOURCES);
            await es.typeSearch({
                resourceType: 'Patient',
                baseUrl: 'https://base-url.com',
                queryParams,
                allowedResourceTypes: ALLOWED_RESOURCE_TYPES,
            });

            expect((ElasticSearch.search as jest.Mock).mock.calls).toMatchSnapshot();
        });
    });
    test('Response format', async () => {
        const patientSearchResult = {
            body: {
                hits: {
                    total: {
                        value: 1,
                        relation: 'eq',
                    },
                    max_score: 1,
                    hits: [
                        {
                            _index: 'patient',
                            _type: '_doc',
                            _id: 'ab69afd3-39ed-42c3-9f77-8a718a247742_1',
                            _score: 1,
                            _source: {
                                vid: '1',
                                gender: 'female',
                                id: 'ab69afd3-39ed-42c3-9f77-8a718a247742',
                                birthDate: '1995-09-24',
                                resourceType: 'Patient',
                            },
                        },
                    ],
                },
            },
        };

        (ElasticSearch.search as jest.Mock).mockResolvedValue(patientSearchResult);

        const es = new ElasticSearchService(FILTER_RULES_FOR_ACTIVE_RESOURCES);
        const result = await es.typeSearch({
            resourceType: 'Patient',
            baseUrl: 'https://base-url.com',
            queryParams: {},
            allowedResourceTypes: ALLOWED_RESOURCE_TYPES,
        });
        expect(result).toMatchSnapshot();
    });

    const fakeMedicationRequestSearchResult = {
        body: {
            took: 5,
            timed_out: false,
            _shards: {
                total: 5,
                successful: 5,
                skipped: 0,
                failed: 0,
            },
            hits: {
                total: {
                    value: 1,
                    relation: 'eq',
                },
                max_score: 1.0,
                hits: [
                    {
                        _index: 'medicationrequest',
                        _type: '_doc',
                        _id: 'medicationrequest-id-111_1',
                        _score: 1.0,
                        _source: {
                            vid: '1',
                            performer: {
                                reference: 'Practitioner/practitioner-id-222',
                            },
                            requester: {
                                reference: 'PractitionerRole/practitionerRole-id-555',
                            },
                            recorder: {
                                reference: 'PractitionerRole/practitionerRole-id-555',
                            },
                            meta: {
                                lastUpdated: '2020-09-10T06:34:46.680Z',
                                versionId: '1',
                            },
                            subject: {
                                reference: 'Patient/patient-id-333',
                            },
                            basedOn: [
                                {
                                    reference: 'ImmunizationRecommendation/immunizationRec-id-444',
                                },
                            ],
                            documentStatus: 'AVAILABLE',
                            id: 'medicationrequest-id-111',
                            lockEndTs: 1599719686680,
                            resourceType: 'MedicationRequest',
                        },
                    },
                ],
            },
        },
    };

    const emptyMsearchResult = {
        body: {
            responses: [],
        },
    };

    describe('_include', () => {
        each([
            [{ _include: '*' }],
            [{ _include: 'MedicationRequest:subject' }],
            [{ _include: 'MedicationRequest:subject:Group' }],
            [{ _include: ['MedicationRequest:subject', 'MedicationRequest:performer'] }],
            [{ _include: ['MedicationRequest:subject', 'MedicationRequest:subject'] }],
        ]).test('queryParams=%j', async (queryParams: any) => {
            (ElasticSearch.search as jest.Mock).mockResolvedValue(fakeMedicationRequestSearchResult);
            (ElasticSearch.msearch as jest.Mock).mockResolvedValue(emptyMsearchResult);

            const es = new ElasticSearchService(FILTER_RULES_FOR_ACTIVE_RESOURCES);
            await es.typeSearch({
                resourceType: 'MedicationRequest',
                baseUrl: 'https://base-url.com',
                queryParams: { ...queryParams },
                allowedResourceTypes: ALLOWED_RESOURCE_TYPES,
            });

            expect((ElasticSearch.search as jest.Mock).mock.calls).toMatchSnapshot('search queries');
            expect((ElasticSearch.msearch as jest.Mock).mock.calls).toMatchSnapshot('msearch queries');
        });

        test('wildcard include with restrictive allowed resource types', async () => {
            (ElasticSearch.search as jest.Mock).mockResolvedValue(fakeMedicationRequestSearchResult);
            (ElasticSearch.msearch as jest.Mock).mockResolvedValue(emptyMsearchResult);

            const es = new ElasticSearchService(FILTER_RULES_FOR_ACTIVE_RESOURCES);
            await es.typeSearch({
                resourceType: 'MedicationRequest',
                baseUrl: 'https://base-url.com',
                queryParams: { _include: '*' },
                allowedResourceTypes: ['MedicationRequest'],
            });

            expect((ElasticSearch.search as jest.Mock).mock.calls).toMatchSnapshot('search queries');
            expect((ElasticSearch.msearch as jest.Mock).mock.calls).toMatchSnapshot('msearch queries');
        });
    });

    describe('_revinclude', () => {
        each([
            [{ _revinclude: '*' }],
            [{ _revinclude: 'MedicationAdministration:request' }],
            [{ _revinclude: 'MedicationAdministration:request:MedicationRequest' }],
            [{ _revinclude: 'MedicationAdministration:request:Device' }],
            [{ _revinclude: ['MedicationAdministration:request', 'Provenance:target'] }],
            [{ _revinclude: ['MedicationAdministration:request', 'MedicationAdministration:request'] }],
        ]).test('queryParams=%j', async (queryParams: any) => {
            (ElasticSearch.search as jest.Mock).mockResolvedValue(fakeMedicationRequestSearchResult);
            (ElasticSearch.msearch as jest.Mock).mockResolvedValue(emptyMsearchResult);

            const es = new ElasticSearchService(FILTER_RULES_FOR_ACTIVE_RESOURCES);
            await es.typeSearch({
                resourceType: 'MedicationRequest',
                baseUrl: 'https://base-url.com',
                queryParams: { ...queryParams },
                allowedResourceTypes: ALLOWED_RESOURCE_TYPES,
            });

            expect((ElasticSearch.search as jest.Mock).mock.calls).toMatchSnapshot('search queries');
            expect((ElasticSearch.msearch as jest.Mock).mock.calls).toMatchSnapshot('msearch queries');
        });
    });

    test('_include:iterate', async () => {
        (ElasticSearch.search as jest.Mock).mockResolvedValue(fakeMedicationRequestSearchResult);
        (ElasticSearch.msearch as jest.Mock).mockResolvedValueOnce({
            body: {
                took: 0,
                responses: [
                    {
                        hits: {
                            total: {
                                value: 1,
                                relation: 'eq',
                            },
                            max_score: 0,
                            hits: [
                                {
                                    _source: {
                                        id: 'patient-id-333',
                                        resourceType: 'Patient',
                                        managingOrganization: {
                                            reference: 'Organization/org-id-111',
                                        },
                                    },
                                },
                            ],
                        },
                        status: 200,
                    },
                ],
            },
        });
        (ElasticSearch.msearch as jest.Mock).mockResolvedValueOnce({
            body: {
                took: 0,
                responses: [
                    {
                        hits: {
                            total: {
                                value: 1,
                                relation: 'eq',
                            },
                            max_score: 0,
                            hits: [
                                {
                                    _source: {
                                        id: 'org-id-111',
                                        resourceType: 'Organization',
                                    },
                                },
                            ],
                        },
                        status: 200,
                    },
                ],
            },
        });
        const queryParams = { '_include:iterate': ['MedicationRequest:subject', 'Patient:managingOrganization'] };
        const es = new ElasticSearchService(FILTER_RULES_FOR_ACTIVE_RESOURCES);
        await es.typeSearch({
            resourceType: 'MedicationRequest',
            baseUrl: 'https://base-url.com',
            queryParams: { ...queryParams },
            allowedResourceTypes: ALLOWED_RESOURCE_TYPES,
        });

        expect((ElasticSearch.search as jest.Mock).mock.calls).toMatchSnapshot('search queries');
        expect((ElasticSearch.msearch as jest.Mock).mock.calls).toMatchSnapshot('msearch queries');
    });

    test('_revinclude:iterate', async () => {
        (ElasticSearch.search as jest.Mock).mockResolvedValue(fakeMedicationRequestSearchResult);
        (ElasticSearch.msearch as jest.Mock).mockResolvedValueOnce({
            body: {
                took: 0,
                responses: [
                    {
                        hits: {
                            total: {
                                value: 1,
                                relation: 'eq',
                            },
                            max_score: 0,
                            hits: [
                                {
                                    _source: {
                                        id: 'medication-administration-111',
                                        resourceType: 'MedicationAdministration',
                                    },
                                },
                            ],
                        },
                        status: 200,
                    },
                ],
            },
        });
        (ElasticSearch.msearch as jest.Mock).mockResolvedValueOnce({
            body: {
                took: 0,
                responses: [
                    {
                        hits: {
                            total: {
                                value: 1,
                                relation: 'eq',
                            },
                            max_score: 0,
                            hits: [],
                        },
                        status: 200,
                    },
                ],
            },
        });
        const queryParams = {
            '_revinclude:iterate': [
                'MedicationAdministration:request:MedicationRequest',
                'MedicationStatement:partOf:MedicationAdministration',
            ],
        };
        const es = new ElasticSearchService(FILTER_RULES_FOR_ACTIVE_RESOURCES);
        await es.typeSearch({
            resourceType: 'MedicationRequest',
            baseUrl: 'https://base-url.com',
            queryParams: { ...queryParams },
            allowedResourceTypes: ALLOWED_RESOURCE_TYPES,
        });

        expect((ElasticSearch.search as jest.Mock).mock.calls).toMatchSnapshot('search queries');
        expect((ElasticSearch.msearch as jest.Mock).mock.calls).toMatchSnapshot('msearch queries');
    });
});
