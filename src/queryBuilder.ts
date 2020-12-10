/* eslint-disable class-methods-use-this */
import {
    DATEFIELDS,
    NON_SEARCHABLE_PARAMETERS,
    ALLOWED_PREFIXES,
    TYPEOFQUERY,
    PREFIXES,
    ESOPERATORS,
} from './constants';
import { getDocumentField } from './searchParametersMapping';

export interface prefixBasedSearch {
    prefix?: string;
    value: string;
}

export class QueryBuilder {
    private queryParams: any;

    constructor(queryParams: any) {
        this.queryParams = queryParams;
    }

    buildQuery(): any {
        const must: any[] = [];
        const filter: any[] = [];
        const mustNot: any[] = [];
        Object.entries(this.queryParams).forEach(([searchParameter, value]) => {
            // ignore search parameters
            if (NON_SEARCHABLE_PARAMETERS.includes(searchParameter)) {
                return;
            }
            const field = getDocumentField(searchParameter);
            const { typeOfQuery, query } = this.splitQuery(field, searchParameter, value as string);
            if (typeOfQuery === TYPEOFQUERY.FILTER) {
                filter.push(query);
            } else if (typeOfQuery === TYPEOFQUERY.MUST_NOT) {
                mustNot.push(query);
            } else {
                must.push(query);
            }
        });

        return {
            query: {
                bool: {
                    must,
                    must_not: mustNot,
                    filter,
                },
            },
        };
    }

    private formatPrefix(prefix: string): string {
        if (prefix === PREFIXES.GREATEROREQUAL) {
            return ESOPERATORS.GREATEROREQUAL;
        }
        if (prefix === PREFIXES.LESSEROREQUAL) {
            return ESOPERATORS.LESSEROREQUAL;
        }
        if (prefix === PREFIXES.STARTSAFTER) {
            return ESOPERATORS.GREATEROREQUAL;
        }
        if (prefix === PREFIXES.ENDSBEFORE) {
            return ESOPERATORS.LESSEROREQUAL;
        }
        if (prefix === PREFIXES.ENDSBEFORE) {
            return ESOPERATORS.LESSEROREQUAL; // need to implement approximation
        }
        return prefix;
    }

    private splitPrefixAndValue(value: string): prefixBasedSearch {
        // eslint-disable-next-line no-restricted-syntax
        for (const prefix of ALLOWED_PREFIXES) {
            if (value.includes(prefix)) {
                return { prefix: this.formatPrefix(prefix), value: value.split(prefix)[1] };
            }
        }
        return { prefix: undefined, value };
    }

    private dateBasedSearch(searchParameter: string, searchvalue: string): any {
        const search = this.splitPrefixAndValue(searchvalue);
        let query = {};

        // No Prefix is available for dates
        if (search.prefix === undefined) {
            query = {
                range: {
                    [searchParameter]: {
                        gte: search.value,
                        lte: search.value,
                    },
                },
            };
            return { typeOfQuery: TYPEOFQUERY.FILTER, query };
        }

        // NOT EQUAL Prefix
        if (search.prefix === PREFIXES.NOTEQUAL) {
            query = {
                range: {
                    [searchParameter]: {
                        gte: search.value,
                        lte: search.value,
                    },
                },
            };
            return { typeOfQuery: TYPEOFQUERY.MUST_NOT, query };
        }

        // Need to implement approximations

        // All other prefixes
        query = {
            range: {
                [searchParameter]: {
                    [search.prefix]: search.value,
                },
            },
        };
        return { typeOfQuery: TYPEOFQUERY.FILTER, query };
    }

    // Split the query based on search field data types
    private splitQuery(field: string, searchParameter: string, value: string) {
        if (DATEFIELDS.includes(searchParameter)) return this.dateBasedSearch(searchParameter, value);
        //  Use for all other search parameters.
        // TODO: Need to refine this search parameter
        const query = {
            query_string: {
                fields: [field],
                query: value,
                default_operator: 'AND',
                lenient: true,
            },
        };
        return { typeOfQuery: TYPEOFQUERY.MUST, query };
    }
}