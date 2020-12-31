/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

/*
This scripts generates the JSON files at src/schema. Before running the script download the JSON FHIR definition package and copy
the search-parameters.json file into this directory.

You can download the latest FHIR definition from https://www.hl7.org/fhir/downloads.html or find older FHIR versions at http://hl7.org/fhir/directory.html

The nearley compiler needs to be installed separately:
> npm install -g nearley

First compile the grammar and then run the script:
> nearleyc reducedFHIRPath.ne -o reducedFHIRPath.js
> node run.js <fhirVersion>
 */

const nearley = require('nearley');
const _ = require('lodash');
const grammar = require('./reducedFHIRPath');

const UNSUPPORTED_SEARCH_PARAMS = [
    'http://hl7.org/fhir/SearchParameter/Bundle-composition', // Uses "Bundle.entry[0]". We have no way of searching the nth element of an array
    'http://hl7.org/fhir/SearchParameter/Bundle-message', // Uses "Bundle.entry[0]". We have no way of searching the nth element of an array

    'http://hl7.org/fhir/SearchParameter/Patient-deceased', // Does not define a proper path "Patient.deceased.exists() and Patient.deceased != false"

    'http://hl7.org/fhir/SearchParameter/Organization-phonetic', // Requires custom code for phonetic matching
    'http://hl7.org/fhir/SearchParameter/individual-phonetic', // Requires custom code for phonetic matching
];

const isParamSupported = searchParam => {
    if (UNSUPPORTED_SEARCH_PARAMS.includes(searchParam.url)) {
        return false;
    }

    if (searchParam.type === 'composite') {
        return false;
    }

    if (searchParam.type === 'special') {
        // requires custom code. i.e. Location.near is supposed to do a geospatial search.
        return false;
    }
    return true;
};

const compileSearchParams = searchParams => {
    const compiledSearchParams = searchParams
        .filter(s => s.expression)
        .filter(isParamSupported)
        .map(searchParam => {
            const parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar));
            parser.feed(searchParam.expression);
            return {
                ...searchParam,
                compiled: parser.results[0], // nearley returns an array of results. The array always has exactly one element for non ambiguous grammars
            };
        })
        .flatMap(searchParam => {
            return searchParam.base.map(base => ({
                name: searchParam.name,
                url: searchParam.url,
                type: searchParam.type,
                description: searchParam.description,
                base,
                target: searchParam.target,
                compiled: searchParam.compiled.filter(x => x.resourceType === base),
            }));
        });

    return compiledSearchParams;
};

const compile = searchParams => {
    const compiledSearchParams = compileSearchParams(searchParams);
    return compiledSearchParams;
};

module.exports = compile;
