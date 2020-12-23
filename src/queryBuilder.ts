import {
    DATE_FIELDS,
    NON_SEARCHABLE_PARAMETERS,
    ALLOWED_PREFIXES,
    TYPE_OF_QUERY,
    PREFIXES,
    ES_OPERATORS,
} from './constants';
import { getDocumentField } from './searchParametersMapping';

export interface prefixBasedSearch {
    prefix?: string;
    value: string;
}

// Convert from FHIR standard search prefixes to ES Operators
function formatPrefix(prefix: string): string {
    if (prefix === PREFIXES.GREATER_OR_EQUAL) {
        return ES_OPERATORS.GREATER_OR_EQUAL;
    }
    if (prefix === PREFIXES.LESSER_OR_EQUAL) {
        return ES_OPERATORS.LESSER_OR_EQUAL;
    }
    if (prefix === PREFIXES.STARTS_AFTER) {
        return ES_OPERATORS.GREATER_OR_EQUAL;
    }
    if (prefix === PREFIXES.ENDS_BEFORE) {
        return ES_OPERATORS.LESSER_OR_EQUAL;
    }
    if (prefix === PREFIXES.APPROXIMATION) {
        return ES_OPERATORS.LESSER_OR_EQUAL; // need to implement approximation
    }
    return prefix;
}

// This function is written only for date fields.Function need to be modifed if used for any other parameter searches
function splitPrefixAndValue(value: string): prefixBasedSearch {
    for (let i = 0; i < ALLOWED_PREFIXES.length; i += 1) {
        if (value.includes(ALLOWED_PREFIXES[i])) {
            const searchValue = value.split(ALLOWED_PREFIXES[i]);
            if (searchValue[0] !== '') {
                // This is an error condition. FHIR standard expects date based search only to have prefix.
                // If prefixes (eq,gt etc) added in any other place of search value, it will be treated as part of search value.
                return { prefix: undefined, value };
            }
            return { prefix: formatPrefix(ALLOWED_PREFIXES[i]), value: searchValue[1] };
        }
    }
    return { prefix: undefined, value };
}

function dateBasedSearch(searchParameter: string, searchvalue: string): any {
    const search = splitPrefixAndValue(searchvalue);
    let query = {};

    // No Prefix is available for dates
    if (search.prefix === undefined || search.prefix === PREFIXES.EQUAL) {
        query = {
            range: {
                [searchParameter]: {
                    gte: search.value,
                    lte: search.value,
                },
            },
        };
        return { typeOfQuery: TYPE_OF_QUERY.FILTER, query };
    }

    // NOT EQUAL Prefix
    if (search.prefix === PREFIXES.NOT_EQUAL) {
        query = {
            range: {
                [searchParameter]: {
                    gte: search.value,
                    lte: search.value,
                },
            },
        };
        return { typeOfQuery: TYPE_OF_QUERY.MUST_NOT, query };
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
    return { typeOfQuery: TYPE_OF_QUERY.FILTER, query };
}

// Split the query based on search field data types
function splitQuery(field: string, searchParameter: string, value: string) {
    if (DATE_FIELDS.includes(searchParameter)) return dateBasedSearch(searchParameter, value);
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
    return { typeOfQuery: TYPE_OF_QUERY.MUST, query };
}

/**
 * @param Pass Query strings  {"parameter1": "prefixvalue1", "parameter2": "prefixvalue2"}
 * ex - {"birthDate": "eq2020-12-01"}
 * @param filterRulesForActiveResources - If you are storing both History and Search resources
 * in your elastic search you can filter out your History elements by supplying a filter argument like:
 * [{ match: { documentStatus: 'AVAILABLE' }}]
 * @param Returns built ES query
 */

export function buildQuery(queryParams: any, filterRulesForActiveResources: any): any {
    const must: any[] = [];
    const filter: any[] = [];
    const mustNot: any[] = [];
    // Filter based on the user request
    if (filterRulesForActiveResources.length > 0) filter.push(...filterRulesForActiveResources);

    Object.entries(queryParams).forEach(([searchParameter, value]) => {
        // ignore search parameters
        if (NON_SEARCHABLE_PARAMETERS.includes(searchParameter)) {
            return;
        }
        const field = getDocumentField(searchParameter);
        const { typeOfQuery, query } = splitQuery(field, searchParameter, value as string);
        if (typeOfQuery === TYPE_OF_QUERY.FILTER) {
            filter.push(query);
        } else if (typeOfQuery === TYPE_OF_QUERY.MUST_NOT) {
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
