/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

const compile = require('./compile');

describe('compile', () => {
    test(`simple path - Patient.communication.language`, () => {
        const compiled = compile([
            {
                url: 'http://hl7.org/fhir/SearchParameter/Patient-language',
                name: 'language',
                type: 'token',
                description: 'Language code (irrespective of use value)',
                base: ['Patient'],
                expression: 'Patient.communication.language',
            },
        ]);

        expect(compiled).toMatchSnapshot();
    });

    test(`simple where - Library.relatedArtifact.where(type='predecessor').resource`, () => {
        const compiled = compile([
            {
                name: 'predecessor',
                description: 'What resource is being referenced',
                base: ['Library'],
                type: 'reference',
                expression: "Library.relatedArtifact.where(type='predecessor').resource",
                target: ['Account', 'ActivityDefinition'],
            },
        ]);
        expect(compiled).toMatchSnapshot();
    });

    test(`where with resolve() is - Person.link.target.where(resolve() is RelatedPerson)`, () => {
        const compiled = compile([
            {
                url: 'http://hl7.org/fhir/SearchParameter/Person-relatedperson',
                name: 'relatedperson',
                type: 'reference',
                description: 'The Person links to this RelatedPerson',
                base: ['Person'],
                expression: 'Person.link.target.where(resolve() is RelatedPerson)',
                target: ['RelatedPerson'],
            },
        ]);
        expect(compiled).toMatchSnapshot();
    });
    test(`as - (ConceptMap.source as uri)`, () => {
        const compiled = compile([
            {
                url: 'http://hl7.org/fhir/SearchParameter/ConceptMap-source-uri',
                name: 'source-uri',
                type: 'reference',
                description: 'The source value set that contains the concepts that are being mapped',
                base: ['ConceptMap'],
                expression: '(ConceptMap.source as uri)',
                target: ['ValueSet'],
            },
        ]);
        expect(compiled).toMatchSnapshot();
    });
    test(`OR operator - CapabilityStatement.title | CodeSystem.title | ConceptMap.title | ImplementationGuide.title | MessageDefinition.title | OperationDefinition.title | StructureDefinition.title | StructureMap.title | TerminologyCapabilities.title | ValueSet.title`, () => {
        const compiled = compile([
            {
                url: 'http://hl7.org/fhir/SearchParameter/conformance-title',
                name: 'title',
                type: 'string',
                description: 'Multiple Resources...',
                base: [
                    'CapabilityStatement',
                    'CodeSystem',
                    'ConceptMap',
                    'ImplementationGuide',
                    'MessageDefinition',
                    'OperationDefinition',
                    'StructureDefinition',
                    'StructureMap',
                    'TerminologyCapabilities',
                    'ValueSet',
                ],
                expression:
                    'CapabilityStatement.title | CodeSystem.title | ConceptMap.title | ImplementationGuide.title | MessageDefinition.title | OperationDefinition.title | StructureDefinition.title | StructureMap.title | TerminologyCapabilities.title | ValueSet.title',
            },
        ]);
        expect(compiled).toMatchSnapshot();
    });
    test(`OR operator with same base resource - (ExampleScenario.useContext.value as Quantity) | (ExampleScenario.useContext.value as Range)`, () => {
        const compiled = compile([
            {
                url: 'http://hl7.org/fhir/SearchParameter/ExampleScenario-context-quantity',
                name: 'context-quantity',
                type: 'quantity',
                description: 'A quantity- or range-valued use context assigned to the example scenario',
                base: ['ExampleScenario'],
                expression:
                    '(ExampleScenario.useContext.value as Quantity) | (ExampleScenario.useContext.value as Range)',
            },
        ]);
        expect(compiled).toMatchSnapshot();
    });
});
