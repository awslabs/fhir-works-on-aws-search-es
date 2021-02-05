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
import { ElasticSearch } from './elasticSearch';
import { DEFAULT_SEARCH_RESULTS_PER_PAGE, SEARCH_PAGINATION_PARAMS } from './constants';
import { buildIncludeQueries, buildRevIncludeQueries } from './searchInclusions';
import { FHIRSearchParametersRegistry } from './FHIRSearchParametersRegistry';

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

const escapeQueryString = (string: string) => {
    return string.replace(/\//g, '\\/');
};

// eslint-disable-next-line import/prefer-default-export
export class ElasticSearchService implements Search {
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
     */
    constructor(
        searchFiltersForAllQueries: SearchFilter[] = [],
        cleanUpFunction: (resource: any) => any = function passThrough(resource: any) {
            return resource;
        },
        fhirVersion: FhirVersion = '4.0.1',
        compiledImplementationGuides?: any,
    ) {
        this.searchFiltersForAllQueries = searchFiltersForAllQueries;
        this.cleanUpFunction = cleanUpFunction;
        this.fhirVersion = fhirVersion;
        this.fhirSearchParametersRegistry = new FHIRSearchParametersRegistry(fhirVersion, compiledImplementationGuides);
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

            // Exp. {gender: 'male', name: 'john'}
            const searchParameterToValue = { ...queryParams };

            const must: any[] = [];
            // TODO Implement fuzzy matches
            Object.entries(searchParameterToValue).forEach(([searchParameter, searchValue]) => {
                if (NON_SEARCHABLE_PARAMETERS.includes(searchParameter)) {
                    return;
                }
                const value = escapeQueryString(searchValue as string);
                const fhirSearchParam = this.fhirSearchParametersRegistry.getSearchParameter(
                    resourceType,
                    searchParameter,
                );
                if (fhirSearchParam === undefined) {
                    throw new InvalidSearchParameterError(
                        `Invalid search parameter '${searchParameter}' for resource type ${resourceType}`,
                    );
                }

                const queries = fhirSearchParam.compiled.map(compiled => {
                    const fields = [compiled.path, `${compiled.path}.*`];

                    const pathQuery = {
                        query_string: {
                            fields,
                            query: value,
                            default_operator: 'AND',
                            lenient: true,
                        },
                    };

                    // In most cases conditions are used for fields that are an array of objects
                    // Ideally we should be using a nested query, but that'd require to update the index mappings.
                    //
                    // Simply using an array of bool.must is good enough for most cases. The result will contain the correct documents, however it MAY contain additional documents
                    // https://www.elastic.co/guide/en/elasticsearch/reference/current/nested.html
                    if (compiled.condition !== undefined) {
                        return {
                            bool: {
                                must: [
                                    pathQuery,
                                    {
                                        query_string: {
                                            fields: [compiled.condition[0], `${compiled.condition[0]}.*`],
                                            query: compiled.condition[2],
                                            lenient: true,
                                        },
                                    },
                                ],
                            },
                        };
                    }
                    return pathQuery;
                });

                if (queries.length === 1) {
                    must.push(queries[0]);
                } else {
                    must.push({
                        bool: {
                            should: queries,
                        },
                    });
                }
            });

            const filter: any[] = ElasticSearchService.buildElasticSearchFilter([
                ...this.searchFiltersForAllQueries,
                ...(searchFilters ?? []),
            ]);

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
            lowerCaseAllowedResourceTypes.has(query.index),
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
