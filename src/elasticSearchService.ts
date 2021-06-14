/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable no-underscore-dangle */
import URL from 'url';

import { ResponseError } from '@elastic/elasticsearch/lib/errors';
import { partition } from 'lodash';
import {
    Search,
    TypeSearchRequest,
    SearchResult,
    SearchResponse,
    GlobalSearchRequest,
    SearchEntry,
    SearchFilter,
    FhirVersion,
    InvalidSearchParameterError,
} from 'fhir-works-on-aws-interface';
import { Client } from '@elastic/elasticsearch';
import { ElasticSearch } from './elasticSearch';
import {
    DEFAULT_SEARCH_RESULTS_PER_PAGE,
    SEARCH_PAGINATION_PARAMS,
    ITERATIVE_INCLUSION_PARAMETERS,
    SORT_PARAMETER,
    MAX_ES_WINDOW_SIZE,
} from './constants';
import { buildIncludeQueries, buildRevIncludeQueries } from './searchInclusions';
import { FHIRSearchParametersRegistry } from './FHIRSearchParametersRegistry';
import { buildQueryForAllSearchParameters, buildSortClause } from './QueryBuilder';
import getComponentLogger from './loggerBuilder';

const logger = getComponentLogger();

const MAX_INCLUDE_ITERATIVE_DEPTH = 5;

// eslint-disable-next-line import/prefer-default-export
export class ElasticSearchService implements Search {
    private readonly esClient: Client;

    private readonly searchFiltersForAllQueries: SearchFilter[];

    private readonly cleanUpFunction: (resource: any) => any;

    private readonly fhirVersion: FhirVersion;

    private readonly fhirSearchParametersRegistry: FHIRSearchParametersRegistry;

    /**
     * @param searchFiltersForAllQueries - If you are storing both History and Search resources
     * in your elastic search you can filter out your History elements by supplying a list of SearchFilters
     *
     * @param cleanUpFunction - If you are storing non-fhir related parameters pass this function to clean
     * the return ES objects
     * @param fhirVersion
     * @param compiledImplementationGuides - The output of ImplementationGuides.compile.
     * This parameter enables support for search parameters defined in Implementation Guides.
     * @param esClient
     */
    constructor(
        searchFiltersForAllQueries: SearchFilter[] = [],
        cleanUpFunction: (resource: any) => any = function passThrough(resource: any) {
            return resource;
        },
        fhirVersion: FhirVersion = '4.0.1',
        compiledImplementationGuides?: any,
        esClient: Client = ElasticSearch,
    ) {
        this.searchFiltersForAllQueries = searchFiltersForAllQueries;
        this.cleanUpFunction = cleanUpFunction;
        this.fhirVersion = fhirVersion;
        this.fhirSearchParametersRegistry = new FHIRSearchParametersRegistry(fhirVersion, compiledImplementationGuides);
        this.esClient = esClient;
    }

    async getCapabilities() {
        return this.fhirSearchParametersRegistry.getCapabilities();
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

            if (from + size > MAX_ES_WINDOW_SIZE) {
                logger.info(
                    `Search request is out of bound. Trying to access ${from} to ${from +
                        size} which is outside of the max: ${MAX_ES_WINDOW_SIZE}`,
                );
                throw new InvalidSearchParameterError(
                    `Search parameters: ${SEARCH_PAGINATION_PARAMS.PAGES_OFFSET} and ${SEARCH_PAGINATION_PARAMS.COUNT} are accessing items outside the max range (${MAX_ES_WINDOW_SIZE}). Please narrow your search to access the remaining items`,
                );
            }

            const filter: any[] = ElasticSearchService.buildElasticSearchFilter([
                ...this.searchFiltersForAllQueries,
                ...(searchFilters ?? []),
            ]);
            const query = buildQueryForAllSearchParameters(this.fhirSearchParametersRegistry, request, filter);

            const params: any = {
                index: `${resourceType.toLowerCase()}-alias`,
                from,
                size,
                track_total_hits: true,
                body: {
                    query,
                },
            };

            if (request.queryParams[SORT_PARAMETER]) {
                params.body.sort = buildSortClause(
                    this.fhirSearchParametersRegistry,
                    resourceType,
                    request.queryParams[SORT_PARAMETER],
                );
            }

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
                        ...queryParams,
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
                        ...queryParams,
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
            logger.error(error);
            throw error;
        }
    }

    // eslint-disable-next-line class-methods-use-this
    private async executeQuery(searchQuery: any): Promise<{ hits: any[]; total: number }> {
        try {
            if (logger.isDebugEnabled()) {
                logger.debug(`Elastic search query: ${JSON.stringify(searchQuery, null, 2)}`);
            }
            const apiResponse = await this.esClient.search(searchQuery);
            return {
                total: apiResponse.body.hits.total.value,
                hits: apiResponse.body.hits.hits,
            };
        } catch (error) {
            // Indexes are created the first time a resource of a given type is written to DDB.
            if (error instanceof ResponseError && error.message === 'index_not_found_exception') {
                logger.info(`Search index for ${searchQuery.index} does not exist. Returning an empty search result`);
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
        if (logger.isDebugEnabled()) {
            logger.debug(`Elastic msearch query: ${JSON.stringify(searchQueries, null, 2)}`);
        }
        const apiResponse = await this.esClient.msearch({
            body: searchQueries.flatMap(query => [{ index: query.index }, { query: query.body.query }]),
        });

        return (apiResponse.body.responses as any[])
            .filter(response => {
                if (response.error) {
                    if (response.error.type === 'index_not_found_exception') {
                        // Indexes are created the first time a resource of a given type is written to DDB.
                        logger.info(
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
        const { queryParams, searchFilters, allowedResourceTypes, baseUrl } = request;
        const filter: any[] = ElasticSearchService.buildElasticSearchFilter([
            ...this.searchFiltersForAllQueries,
            ...(searchFilters ?? []),
        ]);

        const includeSearchQueries = buildIncludeQueries(
            queryParams,
            searchEntries.map(x => x.resource),
            filter,
            this.fhirSearchParametersRegistry,
            iterative,
        );

        const revIncludeSearchQueries = buildRevIncludeQueries(
            queryParams,
            searchEntries.map(x => x.resource),
            filter,
            this.fhirSearchParametersRegistry,
            iterative,
        );

        const lowerCaseAllowedResourceTypes = new Set(allowedResourceTypes.map((r: string) => r.toLowerCase()));
        const allowedInclusionQueries = [...includeSearchQueries, ...revIncludeSearchQueries].filter(query =>
            lowerCaseAllowedResourceTypes.has(query.index.split('-')[0]),
        );

        const { hits } = await this.executeQueries(allowedInclusionQueries);
        return this.hitsToSearchEntries({ hits, baseUrl, mode: 'include' });
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

        logger.info('Iterative inclusion search starts');

        let resourcesToIterate = searchEntries;
        for (let i = 0; i < MAX_INCLUDE_ITERATIVE_DEPTH; i += 1) {
            // eslint-disable-next-line no-await-in-loop
            const resourcesFound = await this.processSearchInclusions(resourcesToIterate, request, true);

            resourcesToIterate.forEach(resource => resourceIdsWithInclusionsAlreadyResolved.add(resource.resource.id));
            if (resourcesFound.length === 0) {
                logger.info(`Iteration ${i} found zero results. Stopping`);
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
                logger.info('MAX_INCLUDE_ITERATIVE_DEPTH reached. Stopping');
                break;
            }
            resourcesToIterate = resourcesFound.filter(
                r => !resourceIdsWithInclusionsAlreadyResolved.has(r.resource.id),
            );
            logger.info(`Iteration ${i} found ${resourcesFound.length} resources`);
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
        logger.info(request);
        throw new Error('Method not implemented.');
    }

    private static buildSingleElasticSearchFilterPart(
        key: string,
        value: string,
        operator: '==' | '!=' | '>' | '<' | '>=' | '<=',
    ): any {
        switch (operator) {
            case '==': {
                return {
                    match: {
                        [key]: value,
                    },
                };
            }
            case '!=': {
                return {
                    bool: {
                        must_not: [
                            {
                                term: {
                                    [key]: value,
                                },
                            },
                        ],
                    },
                };
            }
            case '>': {
                return {
                    range: {
                        [key]: {
                            gt: value,
                        },
                    },
                };
            }
            case '<': {
                return {
                    range: {
                        [key]: {
                            lt: value,
                        },
                    },
                };
            }
            case '>=': {
                return {
                    range: {
                        [key]: {
                            gte: value,
                        },
                    },
                };
            }
            case '<=': {
                return {
                    range: {
                        [key]: {
                            lte: value,
                        },
                    },
                };
            }
            default: {
                throw new Error('Unknown comparison operator');
            }
        }
    }

    private static buildElasticSearchFilterPart(searchFilter: SearchFilter): any {
        const { key, value, comparisonOperator, logicalOperator } = searchFilter;

        if (value.length === 0) {
            throw new Error('Malformed SearchFilter, at least 1 value is required for the comparison');
        }
        const parts: any[] = value.map((v: string) => {
            return ElasticSearchService.buildSingleElasticSearchFilterPart(key, v, comparisonOperator);
        });

        if (logicalOperator === 'AND' && parts.length > 1) {
            return {
                bool: {
                    should: parts,
                },
            };
        }

        return parts;
    }

    /**
     * ES filter is created where all 'AND' filters are required and at least 1 'OR' condition is met
     * @returns the `filter` part of the ES query
     */
    private static buildElasticSearchFilter(searchFilters: SearchFilter[]): any[] {
        const partitions: SearchFilter[][] = partition(searchFilters, filter => {
            return filter.logicalOperator === 'OR';
        });
        const orSearchFilterParts: any[] = partitions[0].map(ElasticSearchService.buildElasticSearchFilterPart).flat();
        const andSearchFilterParts: any[] = partitions[1].map(ElasticSearchService.buildElasticSearchFilterPart).flat();
        let filterQuery: any[] = [];
        if (andSearchFilterParts.length > 0) {
            filterQuery = andSearchFilterParts;
        }
        if (orSearchFilterParts.length > 0) {
            filterQuery.push({
                bool: {
                    should: orSearchFilterParts,
                },
            });
        }

        return filterQuery;
    }
}
