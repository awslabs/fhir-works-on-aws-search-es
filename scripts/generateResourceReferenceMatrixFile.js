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

const data = JSON.parse(fs.readFileSync('profiles-resources.json', { encoding: 'utf8' }));

const { fhirVersion } = data.entry[0].resource;

if (fhirVersion.startsWith('4')) {
    const r = data.entry
        .filter(entry => entry.resource.baseDefinition === 'http://hl7.org/fhir/StructureDefinition/DomainResource')
        .flatMap(entry => {
            return entry.resource.snapshot.element
                .filter(element => element.type && element.type[0].code === 'Reference')
                .flatMap(element =>
                    element.type[0].targetProfile.map(target => [
                        entry.resource.type,
                        element.id.replace(`${entry.resource.type}.`, '').replace('[x]', ''),
                        target,
                    ]),
                );
        })
        .map(([resourceType, field, target]) => [
            resourceType,
            field,
            target.replace('http://hl7.org/fhir/StructureDefinition/', ''),
        ]);
    fs.writeFileSync(
        `../src/schema/fhirResourceReferencesMatrix.v${fhirVersion}.json`,
        stringify(r, { maxLength: 200 }),
    );
}

if (fhirVersion.startsWith('3')) {
    const r = data.entry
        .filter(entry => entry.resource.baseDefinition === 'http://hl7.org/fhir/StructureDefinition/DomainResource')
        .flatMap(entry => {
            return entry.resource.snapshot.element
                .filter(element => !!element.type)
                .flatMap(element => {
                    return element.type
                        .filter(type => type.code === 'Reference' && !!type.targetProfile)
                        .map(type => [
                            entry.resource.type,
                            element.id.replace(`${entry.resource.type}.`, '').replace('[x]', ''),
                            type.targetProfile,
                        ]);
                });
        })
        .map(([resourceType, field, target]) => [
            resourceType,
            field,
            target.replace('http://hl7.org/fhir/StructureDefinition/', ''),
        ]);
    fs.writeFileSync(
        `../src/schema/fhirResourceReferencesMatrix.v${fhirVersion}.json`,
        stringify(r, { maxLength: 200 }),
    );
}
