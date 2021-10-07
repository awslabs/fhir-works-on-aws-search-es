/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 *
 */

import { ResponseError } from '@elastic/elasticsearch/lib/errors';
import { Client } from '@elastic/elasticsearch';
import { ElasticSearch } from '../elasticSearch';

const toIndexName = (resourceType: string) => resourceType.toLowerCase();

// eslint-disable-next-line import/prefer-default-export
export class SearchMappingsManager {
    private readonly searchMappings: {
        [resourceType: string]: any;
    };

    private readonly numberOfShards: number;

    private readonly searchClient: Client;

    constructor({
        searchMappings,
        numberOfShards,
        searchClient = ElasticSearch,
    }: {
        searchMappings: { [resourceType: string]: any };
        numberOfShards: number;
        searchClient?: Client;
    }) {
        this.searchMappings = searchMappings;
        this.numberOfShards = numberOfShards;
        this.searchClient = searchClient;
    }

    /**
     * Updates the mappings for all the FHIR resource types. If an index does not exist, it is created
     */
    async createOrUpdateMappings() {
        const resourceTypesWithoutIndex: string[] = [];

        // eslint-disable-next-line no-restricted-syntax
        for (const [resourceType, mappings] of Object.entries(this.searchMappings)) {
            console.log(`sending putMapping request for: ${resourceType}`);
            try {
                // eslint-disable-next-line no-await-in-loop
                await this.searchClient.indices.put_mapping({
                    index: toIndexName(resourceType),
                    body: mappings,
                });
            } catch (error) {
                if (error instanceof ResponseError && error.body.error.type === 'index_not_found_exception') {
                    console.log(`index for ${resourceType} was not found. It will be created`);
                    resourceTypesWithoutIndex.push(resourceType);
                } else {
                    throw error;
                }
            }
        }

        // eslint-disable-next-line no-restricted-syntax
        for (const resourceType of resourceTypesWithoutIndex) {
            console.log(`creating index for ${resourceType}`);
            // eslint-disable-next-line no-await-in-loop
            await this.searchClient.indices.create({
                index: toIndexName(resourceType),
                body: {
                    mappings: this.searchMappings[resourceType],
                    settings: {
                        number_of_shards: this.numberOfShards,
                    },
                },
            });
        }
    }
}
