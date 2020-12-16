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
    SearchFilter,
    KeyValueMap,
    FhirVersion,
} from 'fhir-works-on-aws-interface';
import { ElasticSearch } from './elasticSearch';
import { DEFAULT_SEARCH_RESULTS_PER_PAGE, SEARCH_PAGINATION_PARAMS } from './constants';
import { buildIncludeQueries, buildRevIncludeQueries } from './searchInclusions';
import { getDocumentField } from './searchParametersMapping';

const ITERATIVE_INCLUSION_PARAMETERS = ['_include:iterate', '_revinclude:iterate'];

const NON_SEARCHABLE_PARAMETERS = [
    SEARCH_PAGINATION_PARAMS.PAGES_OFFSET,
    SEARCH_PAGINATION_PARAMS.COUNT,
    '_format',
    '_include',
    '_revinclude',
    ...ITERATIVE_INCLUSION_PARAMETERS,
];

const MAX_INCLUDE_ITERATIVE_DEPTH = 5;

// eslint-disable-next-line import/prefer-default-export
export class ElasticSearchService implements Search {
    private readonly searchFiltersForAllQueries: SearchFilter[];

    private readonly cleanUpFunction: (resource: any) => any;

    private readonly fhirVersion: FhirVersion;

    /**
     * @param searchFiltersForAllQueries - If you are storing both History and Search resources
     * in your elastic search you can filter out your History elements by supplying a list of SearchFilters
     *
     * @param cleanUpFunction - If you are storing non-fhir related parameters pass this function to clean
     * the return ES objects
     * @param fhirVersion
     */
    constructor(
        searchFiltersForAllQueries: SearchFilter[] = [],
        cleanUpFunction: (resource: any) => any = function passThrough(resource: any) {
            return resource;
        },
        fhirVersion: FhirVersion = '4.0.1',
    ) {
        this.searchFiltersForAllQueries = searchFiltersForAllQueries;
        this.cleanUpFunction = cleanUpFunction;
        this.fhirVersion = fhirVersion;
    }

    /*
    searchParams => {field: value}
     */
    async typeSearch(request: TypeSearchRequest): Promise<SearchResponse> {
        const { queryParams, searchFilters, resourceType } = request;
        try {
            const from = queryParams[SEARCH_PAGINATION_PARAMS.PAGES_OFFSET]
                ? Number(queryParams[SEARCH_PAGINATION_PARAMS.PAGES_OFFSET])
                : 0;

            const size = queryParams[SEARCH_PAGINATION_PARAMS.COUNT]
                ? Number(queryParams[SEARCH_PAGINATION_PARAMS.COUNT])
                : DEFAULT_SEARCH_RESULTS_PER_PAGE;

            // Exp. {gender: 'male', name: 'john'}
            const searchParameterToValue = { ...queryParams };
            console.log('searchParameterToValue:', searchParameterToValue);
            const must: SearchFilter[] = ElasticSearchService.searchFiltersToElasticQuery(
                this.queryParamsToSearchFilter(searchParameterToValue),
            );
            console.log('must:', must);

            const filter: SearchFilter[] = ElasticSearchService.searchFiltersToElasticQuery([
                ...this.searchFiltersForAllQueries,
                ...(searchFilters ?? []),
            ]);
            console.log('filter:', filter);

            const params = {
                index: resourceType.toLowerCase(),
                from,
                size,
                body: {
                    query: {
                        bool: {
                            filter,
                            must,
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
                        ...searchParameterToValue,
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
                        ...searchParameterToValue,
                        [SEARCH_PAGINATION_PARAMS.PAGES_OFFSET]: from + size,
                        [SEARCH_PAGINATION_PARAMS.COUNT]: size,
                    },
                    resourceType,
                );
            }

            const includedResources = await this.processSearchInclusions(result.entries, request);
            result.entries.push(...includedResources);

            const iterativelyIncludedResources = await this.processIterativeSearchInclusions(result.entries, request);
            result.entries.push(...iterativelyIncludedResources);

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

    // eslint-disable-next-line class-methods-use-this
    private async executeQueries(searchQueries: any[]): Promise<{ hits: any[] }> {
        if (searchQueries.length === 0) {
            return {
                hits: [],
            };
        }
        const apiResponse = await ElasticSearch.msearch({
            body: searchQueries.flatMap(query => [{ index: query.index }, { query: query.body.query }]),
        });

        return (apiResponse.body.responses as any[])
            .filter(response => {
                if (response.error) {
                    if (response.error.type === 'index_not_found_exception') {
                        // Indexes are created the first time a resource of a given type is written to DDB.
                        console.log(
                            `Search index for ${response.error.index} does not exist. Returning an empty search result`,
                        );
                        return false;
                    }
                    throw response.error;
                }
                return true;
            })
            .reduce(
                (acc, response) => {
                    acc.hits.push(...response.hits.hits);
                    return acc;
                },
                {
                    hits: [],
                },
            );
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

    private async processSearchInclusions(
        searchEntries: SearchEntry[],
        request: TypeSearchRequest,
        iterative?: true,
    ): Promise<SearchEntry[]> {
        const includeSearchQueries = buildIncludeQueries(
            request.queryParams,
            searchEntries.map(x => x.resource),
            ElasticSearchService.searchFiltersToElasticQuery(this.searchFiltersForAllQueries),
            this.fhirVersion,
            iterative,
        );

        const revIncludeSearchQueries = buildRevIncludeQueries(
            request.queryParams,
            searchEntries.map(x => x.resource),
            ElasticSearchService.searchFiltersToElasticQuery(this.searchFiltersForAllQueries),
            this.fhirVersion,
            iterative,
        );

        const lowerCaseAllowedResourceTypes = new Set(request.allowedResourceTypes.map(r => r.toLowerCase()));
        const allowedInclusionQueries = [...includeSearchQueries, ...revIncludeSearchQueries].filter(query =>
            lowerCaseAllowedResourceTypes.has(query.index),
        );

        const { hits } = await this.executeQueries(allowedInclusionQueries);
        return this.hitsToSearchEntries({ hits, baseUrl: request.baseUrl, mode: 'include' });
    }

    private async processIterativeSearchInclusions(
        searchEntries: SearchEntry[],
        request: TypeSearchRequest,
    ): Promise<SearchEntry[]> {
        if (
            !ITERATIVE_INCLUSION_PARAMETERS.some(param => {
                return request.queryParams[param];
            })
        ) {
            return [];
        }
        const result: SearchEntry[] = [];
        const resourceIdsAlreadyInResult: Set<string> = new Set(
            searchEntries.map(searchEntry => searchEntry.resource.id),
        );
        const resourceIdsWithInclusionsAlreadyResolved: Set<string> = new Set();

        console.log('Iterative inclusion search starts');

        let resourcesToIterate = searchEntries;
        for (let i = 0; i < MAX_INCLUDE_ITERATIVE_DEPTH; i += 1) {
            // eslint-disable-next-line no-await-in-loop
            const resourcesFound = await this.processSearchInclusions(resourcesToIterate, request, true);

            resourcesToIterate.forEach(resource => resourceIdsWithInclusionsAlreadyResolved.add(resource.resource.id));
            if (resourcesFound.length === 0) {
                console.log(`Iteration ${i} found zero results. Stopping`);
                break;
            }

            resourcesFound.forEach(resourceFound => {
                // Avoid duplicates in result. In some cases different include/revinclude clauses can end up finding the same resource.
                if (!resourceIdsAlreadyInResult.has(resourceFound.resource.id)) {
                    resourceIdsAlreadyInResult.add(resourceFound.resource.id);
                    result.push(resourceFound);
                }
            });

            if (i === MAX_INCLUDE_ITERATIVE_DEPTH - 1) {
                console.log('MAX_INCLUDE_ITERATIVE_DEPTH reached. Stopping');
                break;
            }
            resourcesToIterate = resourcesFound.filter(
                r => !resourceIdsWithInclusionsAlreadyResolved.has(r.resource.id),
            );
            console.log(`Iteration ${i} found ${resourcesFound.length} resources`);
        }
        return result;
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

    private queryParamsToSearchFilter(queryParams: KeyValueMap): SearchFilter[] {
        // TODO Implement fuzzy matches
        return Object.entries(queryParams)
            .filter(([searchParameter, value]) => {
                return !NON_SEARCHABLE_PARAMETERS.includes(searchParameter);
            })
            .map(([searchParameter, value]) => {
                const field = getDocumentField(searchParameter);
                return {
                    filterKey: field,
                    filterValue: value,
                    filterOperator: '~',
                };
            });
    }

    private static searchFilterToElasticQuery(searchFilter: SearchFilter): any {
        const { filterKey, filterValue, filterOperator } = searchFilter;

        switch (filterOperator) {
            case '~': {
                return {
                    query_string: {
                        fields: [filterKey],
                        query: filterValue,
                        default_operator: 'AND',
                        lenient: true,
                    },
                };
            }
            case '==': {
                return {
                    match: {
                        [filterKey]: filterValue,
                    },
                };
            }
            case '!=': {
                return {
                    bool: {
                        must_not: [
                            {
                                term: {
                                    [filterKey]: filterValue,
                                },
                            },
                        ],
                    },
                };
            }
            case '>': {
                return {
                    range: {
                        [filterKey]: {
                            gt: filterValue,
                        },
                    },
                };
            }
            case '<': {
                return {
                    range: {
                        [filterKey]: {
                            lt: filterValue,
                        },
                    },
                };
            }
            case '>=': {
                return {
                    range: {
                        [filterKey]: {
                            gte: filterValue,
                        },
                    },
                };
            }
            case '<=': {
                return {
                    range: {
                        [filterKey]: {
                            lte: filterValue,
                        },
                    },
                };
            }
        }
    }

    private static searchFiltersToElasticQuery(searchFilters: SearchFilter[]): any {
        return searchFilters.map(searchFilter => this.searchFilterToElasticQuery(searchFilter));
    }
}
