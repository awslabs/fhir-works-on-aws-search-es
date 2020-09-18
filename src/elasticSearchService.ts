/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable no-underscore-dangle */
import URL from 'url';

import { ResponseError } from '@elastic/elasticsearch/lib/errors';
import {
    Search,
    TypeSearchRequest,
    SearchResult,
    SearchResponse,
    GlobalSearchRequest,
    SearchEntry,
    FhirVersion,
} from 'fhir-works-on-aws-interface';
import { ElasticSearch } from './elasticSearch';
import { DEFAULT_SEARCH_RESULTS_PER_PAGE, SEARCH_PAGINATION_PARAMS } from './constants';
import { buildIncludeQueries, buildRevIncludeQueries } from './searchInclusions';

const NON_SEARCHABLE_FIELDS = [
    SEARCH_PAGINATION_PARAMS.PAGES_OFFSET,
    SEARCH_PAGINATION_PARAMS.COUNT,
    '_format',
    '_include',
    '_revinclude',
];

// eslint-disable-next-line import/prefer-default-export
export class ElasticSearchService implements Search {
    private readonly filterRulesForActiveResources: any[];

    private readonly cleanUpFunction: (resource: any) => any;

    private readonly fhirVersion: FhirVersion;

    /**
     * @param filterRulesForActiveResources - If you are storing both History and Search resources
     * in your elastic search you can filter out your History elements by supplying a filter argument like:
     * [{ match: { documentStatus: 'AVAILABLE' }}]
     * @param cleanUpFunction - If you are storing non-fhir related parameters pass this function to clean
     * the return ES objects
     * @param fhirVersion
     */
    constructor(
        filterRulesForActiveResources: any[] = [],
        cleanUpFunction: (resource: any) => any = function passThrough(resource: any) {
            return resource;
        },
        fhirVersion: FhirVersion = '4.0.1',
    ) {
        this.filterRulesForActiveResources = filterRulesForActiveResources;
        this.cleanUpFunction = cleanUpFunction;
        this.fhirVersion = fhirVersion;
    }

    /*
    searchParams => {field: value}
     */
    async typeSearch(request: TypeSearchRequest): Promise<SearchResponse> {
        const { queryParams, resourceType } = request;
        try {
            const from = queryParams[SEARCH_PAGINATION_PARAMS.PAGES_OFFSET]
                ? Number(queryParams[SEARCH_PAGINATION_PARAMS.PAGES_OFFSET])
                : 0;

            const size = queryParams[SEARCH_PAGINATION_PARAMS.COUNT]
                ? Number(queryParams[SEARCH_PAGINATION_PARAMS.COUNT])
                : DEFAULT_SEARCH_RESULTS_PER_PAGE;

            // Exp. {gender: 'male', name: 'john'}
            const searchFieldToValue = { ...queryParams };

            const must: any = [];
            // TODO Implement fuzzy matches
            Object.keys(searchFieldToValue).forEach(field => {
                // id is mapped in ElasticSearch to be of type "keyword", which requires an exact match
                const fieldParam = field === 'id' ? 'id' : `${field}.*`;
                if (NON_SEARCHABLE_FIELDS.includes(field)) {
                    return;
                }
                const query = {
                    query_string: {
                        fields: [fieldParam],
                        query: queryParams[field],
                        default_operator: 'AND',
                        lenient: true,
                    },
                };
                must.push(query);
            });

            const filter = this.filterRulesForActiveResources;

            const params = {
                index: resourceType.toLowerCase(),
                from,
                size,
                body: {
                    query: {
                        bool: {
                            must,
                            filter,
                        },
                    },
                },
            };
            const { total, hits } = await this.executeQuery(params);
            const result: SearchResult = {
                numberOfResults: total,
                entries: this.hitsToSearchEntries({ hits, baseUrl: request.baseUrl, mode: 'match' }),
                message: '',
            };

            if (from !== 0) {
                result.previousResultUrl = this.createURL(
                    request.baseUrl,
                    {
                        ...searchFieldToValue,
                        [SEARCH_PAGINATION_PARAMS.PAGES_OFFSET]: from - size,
                        [SEARCH_PAGINATION_PARAMS.COUNT]: size,
                    },
                    resourceType,
                );
            }
            if (from + size < total) {
                result.nextResultUrl = this.createURL(
                    request.baseUrl,
                    {
                        ...searchFieldToValue,
                        [SEARCH_PAGINATION_PARAMS.PAGES_OFFSET]: from + size,
                        [SEARCH_PAGINATION_PARAMS.COUNT]: size,
                    },
                    resourceType,
                );
            }

            const [includedResources, revincludedResources] = await Promise.all([
                this.processSearchIncludes(result.entries, request),
                this.processSearchRevIncludes(result.entries, request),
            ]);
            result.entries.push(...includedResources, ...revincludedResources);
            return { result };
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    // eslint-disable-next-line class-methods-use-this
    private async executeQuery(searchQuery: any): Promise<{ hits: any[]; total: number }> {
        try {
            const apiResponse = await ElasticSearch.search(searchQuery);
            return {
                total: apiResponse.body.hits.total.value,
                hits: apiResponse.body.hits.hits,
            };
        } catch (error) {
            // Indexes are created the first time a resource of a given type is written to DDB.
            if (error instanceof ResponseError && error.message === 'index_not_found_exception') {
                console.log(`Search index for ${searchQuery.index} does not exist. Returning an empty search result`);
                return {
                    total: 0,
                    hits: [],
                };
            }
            throw error;
        }
    }

    private hitsToSearchEntries({
        hits,
        baseUrl,
        mode = 'match',
    }: {
        hits: any[];
        baseUrl: string;
        mode: 'match' | 'include';
    }): SearchEntry[] {
        return hits.map(
            (hit: any): SearchEntry => {
                // Modify to return resource with FHIR id not Dynamo ID
                const resource = this.cleanUpFunction(hit._source);
                return {
                    search: {
                        mode,
                    },
                    fullUrl: URL.format({
                        host: baseUrl,
                        pathname: `/${resource.resourceType}/${resource.id}`,
                    }),
                    resource,
                };
            },
        );
    }

    private async processSearchIncludes(
        searchEntries: SearchEntry[],
        request: TypeSearchRequest,
    ): Promise<SearchEntry[]> {
        const searchQueries = buildIncludeQueries(
            request.queryParams,
            searchEntries.map(x => x.resource),
            request.resourceType,
            this.filterRulesForActiveResources,
            this.fhirVersion,
        );

        const searchResults = await Promise.all(
            searchQueries.map(async query => {
                const { hits } = await this.executeQuery(query);
                return this.hitsToSearchEntries({ hits, baseUrl: request.baseUrl, mode: 'include' });
            }),
        );

        return searchResults.flat();
    }

    private async processSearchRevIncludes(
        searchEntries: SearchEntry[],
        request: TypeSearchRequest,
    ): Promise<SearchEntry[]> {
        const searchQueries = buildRevIncludeQueries(
            request.queryParams,
            searchEntries.map(x => x.resource),
            request.resourceType,
            this.filterRulesForActiveResources,
            this.fhirVersion,
        );

        const searchResults = await Promise.all(
            searchQueries.map(async query => {
                const { hits } = await this.executeQuery(query);
                return this.hitsToSearchEntries({ hits, baseUrl: request.baseUrl, mode: 'include' });
            }),
        );
        return searchResults.flat();
    }

    // eslint-disable-next-line class-methods-use-this
    private createURL(host: string, query: any, resourceType?: string) {
        return URL.format({
            host,
            pathname: `/${resourceType}`,
            query,
        });
    }

    // eslint-disable-next-line class-methods-use-this
    async globalSearch(request: GlobalSearchRequest): Promise<SearchResponse> {
        console.log(request);
        throw new Error('Method not implemented.');
    }
}
