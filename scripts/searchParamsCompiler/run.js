/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

/*
This scripts generates the JSON files at src/schema. Before running the script download the JSON FHIR definition package and copy
the search-parameters.json file into this directory.

You can download the latest FHIR definition from https://www.hl7.org/fhir/downloads.html or find older FHIR versions at http://hl7.org/fhir/directory.html

If you are modifying the grammar at reducedFHIRPath.ne you need to compile it. The nearley compiler needs to be installed separately:
> npm install -g nearley
> nearleyc reducedFHIRPath.ne -o reducedFHIRPath.js

Run the script:
> node run.js <fhirVersion>
 */

const fs = require('fs');
const stringify = require('json-stringify-pretty-compact');
const compile = require('./compile');

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

const run = () => {
    const args = process.argv.slice(2);
    if (!args[0]) {
        console.log('Error. Missing fhirVersion parameter');
        console.log('Usage: node run.js <fhirVersion>');
    }
    const fhirVersion = args[0];
    const searchParams = readSearchParamsFile('search-parameters.json');

    const compiledSearchParams = compile(searchParams);

    fs.writeFileSync(
        `../../src/schema/compiledSearchParameters.${fhirVersion}.json`,
        stringify(compiledSearchParams, { maxLength: 100 }),
    );
};

run();
