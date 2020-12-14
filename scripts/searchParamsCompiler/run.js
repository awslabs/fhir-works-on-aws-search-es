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
const fs = require('fs');
const stringify = require('json-stringify-pretty-compact');
const _ = require('lodash');
const grammar = require('./reducedFHIRPath');

const UNSUPPORTED_SEARCH_PARAMS = [
    'http://hl7.org/fhir/SearchParameter/Bundle-composition', // Uses "Bundle.entry[0]". We have no way of searching the nth element of an array
    'http://hl7.org/fhir/SearchParameter/Bundle-message', // Uses "Bundle.entry[0]". We have no way of searching the nth element of an array

    'http://hl7.org/fhir/SearchParameter/Patient-deceased', // Does not define a proper path "Patient.deceased.exists() and Patient.deceased != false"
];

const readSearchParamsFile = path => {
    const data = JSON.parse(fs.readFileSync(path, { encoding: 'utf8' }));
    return data.entry
        .map(x => x.resource)
        .map(({ url, name, type, description, base, expression, target }) => ({
            url,
            name,
            type,
            description,
            base,
            expression,
            target,
        }));
};

const compileSearchParams = searchParams => {
    const compiledSearchParams = searchParams
        .filter(s => s.expression)
        .filter(s => !UNSUPPORTED_SEARCH_PARAMS.includes(s.url))
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
                type: searchParam.type,
                description: searchParam.description,
                target: searchParam.target,
                base,
                compiled: searchParam.compiled.filter(x => x.resourceType === base),
            }));
        });

    const compiledOutput = {};

    compiledSearchParams.forEach(x => {
        compiledOutput[x.base] = compiledOutput[x.base] || {};
        compiledOutput[x.base][x.name] = _.omit(x, 'base', 'name');
    });

    return compiledOutput;
};

/*
SearchParameters with base "Resource" are special and apply to all resources.
This function copies them to all other resource types.
 */
const postProcessResourceParams = compiledObj => {
    const resourceSearchParams = compiledObj.Resource;
    _.unset(compiledObj, 'Resource');
    Object.keys(compiledObj).forEach(k => {
        Object.assign(compiledObj[k], resourceSearchParams);
    });
};

const run = () => {
    const args = process.argv.slice(2);
    if (!args[0]) {
        console.log('Error. Missing fhirVersion parameter');
        console.log('Usage: node run.js <fhirVersion>');
    }
    const fhirVersion = args[0];
    const searchParams = readSearchParamsFile('search-parameters.json');
    const compiledSearchParams = compileSearchParams(searchParams);
    postProcessResourceParams(compiledSearchParams);

    fs.writeFileSync(
        `../../src/schema/compiledSearchParameters.${fhirVersion}.json`,
        stringify(compiledSearchParams, { maxLength: 100 }),
    );
};

run();
