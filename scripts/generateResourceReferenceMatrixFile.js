/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

/*
This scripts generates the JSON files at src/schema. Before running the script download the JSON FHIR definition package and copy
the profiles-resources.json file into this directory.

You can download the latest FHIR definition from https://www.hl7.org/fhir/downloads.html or find older FHIR versions at http://hl7.org/fhir/directory.html
 */

const fs = require('fs');
const stringify = require('json-stringify-pretty-compact');

const data = JSON.parse(fs.readFileSync('profiles-resources.json'));

const { fhirVersion } = data.entry[0].resource;

if (fhirVersion.startsWith('4')) {
    const r = data.entry
        .filter(x => x.resource.baseDefinition === 'http://hl7.org/fhir/StructureDefinition/DomainResource')
        .flatMap(x => {
            return x.resource.snapshot.element
                .filter(el => el.type && el.type[0].code === 'Reference')
                .flatMap(el =>
                    el.type[0].targetProfile.map(target => [
                        x.resource.type,
                        el.id.replace(`${x.resource.type}.`, '').replace('[x]', ''),
                        target,
                    ]),
                );
        })
        .map(([a, b, c]) => [a, b, c.replace('http://hl7.org/fhir/StructureDefinition/', '')]);
    fs.writeFileSync(
        `../src/schema/fhirResourceReferencesMatrix.v${fhirVersion}.json`,
        stringify(r, { maxLength: 200 }),
    );
}

if (fhirVersion.startsWith('3')) {
    const r = data.entry
        .filter(x => x.resource.baseDefinition === 'http://hl7.org/fhir/StructureDefinition/DomainResource')
        .flatMap(x => {
            return x.resource.snapshot.element
                .filter(el => !!el.type)
                .flatMap(el => {
                    return el.type
                        .filter(t => t.code === 'Reference' && !!t.targetProfile)
                        .map(t => [
                            x.resource.type,
                            el.id.replace(`${x.resource.type}.`, '').replace('[x]', ''),
                            t.targetProfile,
                        ]);
                });
        })
        .map(([a, b, c]) => [a, b, c.replace('http://hl7.org/fhir/StructureDefinition/', '')]);
    fs.writeFileSync(
        `../src/schema/fhirResourceReferencesMatrix.v${fhirVersion}.json`,
        stringify(r, { maxLength: 200 }),
    );
}
