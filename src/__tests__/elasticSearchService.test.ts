/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import each from 'jest-each';
import { ElasticSearchService } from '../elasticSearchService';
import { ElasticSearch } from '../elasticSearch';

jest.mock('../elasticSearch');

describe('typeSearch', () => {
    describe('query snapshots for simple queryParams', () => {
        beforeEach(() => {
            jest.resetAllMocks();
        });

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
            const es = new ElasticSearchService();
            await es.typeSearch({
                resourceType: 'Patient',
                baseUrl: 'https://base-url.com',
                queryParams,
            });

            expect(ElasticSearch.search).toMatchSnapshot();
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

        const es = new ElasticSearchService();
        const result = await es.typeSearch({
            resourceType: 'Patient',
            baseUrl: 'https://base-url.com',
            queryParams: {},
        });
        expect(result).toMatchSnapshot();
    });
});
