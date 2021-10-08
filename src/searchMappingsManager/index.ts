/* eslint-disable no-await-in-loop,no-restricted-syntax */
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

    /**
     * @param options
     * @param options.searchMappings - search mappings for all FHIR resource types
     * @param options.numberOfShards - number of shards for each new index created. See the documentation for guidance on how to choose the right number:
     * https://docs.aws.amazon.com/opensearch-service/latest/developerguide/sizing-domains.html#bp-sharding
     * @param options.searchClient - optionally provide your own search client instance
     */
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
        const resourceTypesWithErrors = [];
        for (const [resourceType, mappings] of Object.entries(this.searchMappings)) {
            try {
                try {
                    await this.updateMapping(resourceType, mappings);
                } catch (error) {
                    if (error instanceof ResponseError && error.body.error.type === 'index_not_found_exception') {
                        console.log(`index for ${resourceType} was not found. It will be created`);
                        await this.createIndexWithMapping(resourceType, mappings);
                    } else {
                        throw error;
                    }
                }
            } catch (e) {
                console.log(e);
                console.log(`Failed to update mapping for ${resourceType}:`, JSON.stringify(e, null, 2));
                resourceTypesWithErrors.push(resourceType);
            }
        }

        if (resourceTypesWithErrors.length > 0) {
            throw new Error(`Failed to update mappings for: ${resourceTypesWithErrors}`);
        }
    }

    async updateMapping(resourceType: string, mapping: any) {
        console.log(`sending putMapping request for: ${resourceType}`);
        return this.searchClient.indices.put_mapping({
            index: toIndexName(resourceType),
            body: mapping,
        });
    }

    async createIndexWithMapping(resourceType: string, mapping: any) {
        console.log(`creating index for ${resourceType}`);
        return this.searchClient.indices.create({
            index: toIndexName(resourceType),
            body: {
                mappings: mapping,
                settings: {
                    number_of_shards: this.numberOfShards,
                },
            },
        });
    }
}
