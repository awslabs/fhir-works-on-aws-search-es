/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { SearchImplementationGuides } from './index';

const { compile } = SearchImplementationGuides;

describe('compile', () => {
    test(`simple path - Patient.communication.language`, async () => {
        const compiled = compile([
            {
                resourceType: 'SearchParameter',
                url: 'http://hl7.org/fhir/SearchParameter/Patient-language',
                name: 'language',
                code: 'language',
                type: 'token',
                description: 'Language code (irrespective of use value)',
                base: ['Patient'],
                expression: 'Patient.communication.language',
            },
        ]);

        await expect(compiled).resolves.toMatchSnapshot();
    });

    test(`simple where - Library.relatedArtifact.where(type='predecessor').resource`, async () => {
        const compiled = compile([
            {
                resourceType: 'SearchParameter',
                url: 'http://hl7.org/fhir/SearchParameter/Library-predecessor',
                name: 'predecessor',
                code: 'predecessor',
                description: 'What resource is being referenced',
                base: ['Library'],
                type: 'reference',
                expression: "Library.relatedArtifact.where(type='predecessor').resource",
                target: ['Account', 'ActivityDefinition'],
            },
        ]);
        await expect(compiled).resolves.toMatchSnapshot();
    });

    test(`where with resolve() is - Person.link.target.where(resolve() is RelatedPerson)`, async () => {
        const compiled = compile([
            {
                resourceType: 'SearchParameter',
                url: 'http://hl7.org/fhir/SearchParameter/Person-relatedperson',
                name: 'relatedperson',
                code: 'relatedperson',
                type: 'reference',
                description: 'The Person links to this RelatedPerson',
                base: ['Person'],
                expression: 'Person.link.target.where(resolve() is RelatedPerson)',
                target: ['RelatedPerson'],
            },
        ]);
        await expect(compiled).resolves.toMatchSnapshot();
    });
    test(`as - (ConceptMap.source as uri)`, async () => {
        const compiled = compile([
            {
                resourceType: 'SearchParameter',
                url: 'http://hl7.org/fhir/SearchParameter/ConceptMap-source-uri',
                name: 'source-uri',
                code: 'source-uri',
                type: 'reference',
                description: 'The source value set that contains the concepts that are being mapped',
                base: ['ConceptMap'],
                expression: '(ConceptMap.source as uri)',
                target: ['ValueSet'],
            },
        ]);
        await expect(compiled).resolves.toMatchSnapshot();
    });
    test(`OR operator - CapabilityStatement.title | CodeSystem.title | ConceptMap.title | ImplementationGuide.title | MessageDefinition.title | OperationDefinition.title | StructureDefinition.title | StructureMap.title | TerminologyCapabilities.title | ValueSet.title`, async () => {
        const compiled = compile([
            {
                resourceType: 'SearchParameter',
                url: 'http://hl7.org/fhir/SearchParameter/conformance-title',
                name: 'title',
                code: 'title',
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
        await expect(compiled).resolves.toMatchSnapshot();
    });
    test(`OR operator with same base resource - (ExampleScenario.useContext.value as Quantity) | (ExampleScenario.useContext.value as Range)`, async () => {
        const compiled = compile([
            {
                resourceType: 'SearchParameter',
                url: 'http://hl7.org/fhir/SearchParameter/ExampleScenario-context-quantity',
                name: 'context-quantity',
                code: 'context-quantity',
                type: 'quantity',
                description: 'A quantity- or range-valued use context assigned to the example scenario',
                base: ['ExampleScenario'],
                expression:
                    '(ExampleScenario.useContext.value as Quantity) | (ExampleScenario.useContext.value as Range)',
            },
        ]);
        await expect(compiled).resolves.toMatchSnapshot();
    });

    test(`simple where url value - Patient.extension.where(url = 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-race').extension.value.code`, async () => {
        const compiled = compile([
            {
                resourceType: 'SearchParameter',
                url: 'http://hl7.org/fhir/SearchParameter/test',
                name: 'test',
                code: 'test',
                type: 'token',
                description: 'test',
                base: ['Patient'],
                expression:
                    "Patient.extension.where(url = 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-race').extension.value.code",
            },
        ]);
        await expect(compiled).resolves.toMatchSnapshot();
    });

    test(`expression with extra whitespaces`, async () => {
        const compiled = compile([
            {
                resourceType: 'SearchParameter',
                url: 'http://hl7.org/fhir/SearchParameter/test',
                name: 'test',
                code: 'test',
                type: 'token',
                description: 'test',
                base: ['Patient'],
                expression: "Patient.x.where(field         =         'value')",
            },
        ]);
        await expect(compiled).resolves.toMatchSnapshot();
    });

    test(`Invalid input`, async () => {
        const compiled = compile([
            {
                foo: 'bar',
            },
        ]);
        await expect(compiled).rejects.toThrowError();
    });

    test(`unparsable FHIRPath expression`, async () => {
        const compiled = compile([
            {
                resourceType: 'SearchParameter',
                url: 'http://hl7.org/fhir/SearchParameter/test',
                name: 'test',
                code: 'test',
                type: 'token',
                description: 'test',
                base: ['Patient'],
                expression: 'some random FHIRPath expression that cannot be parsed',
            },
        ]);
        await expect(compiled).rejects.toThrowError();
    });
});
