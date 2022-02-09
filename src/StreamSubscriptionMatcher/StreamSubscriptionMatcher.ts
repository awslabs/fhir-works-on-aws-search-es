/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 *
 */

import { DynamoDBStreamEvent } from 'aws-lambda/trigger/dynamodb-stream';
import { chunk } from 'lodash';
import { FhirVersion, Persistence } from 'fhir-works-on-aws-interface';
import {
    buildNotification,
    filterOutIneligibleResources,
    parseSubscription,
    Subscription,
    SubscriptionNotification,
} from './subscriptions';
import { matchParsedFhirQueryParams } from '../InMemoryMatcher';
import { FHIRSearchParametersRegistry } from '../FHIRSearchParametersRegistry';
import { AsyncRefreshCache } from './AsyncRefreshCache';
import getComponentLogger from '../loggerBuilder';

const SNS_MAX_BATCH_SIZE = 10;

const logger = getComponentLogger();

const matchSubscription = (subscription: Subscription, resource: Record<string, any>): boolean => {
    return (
        // eslint-disable-next-line no-underscore-dangle
        subscription.tenantId === resource._tenantId &&
        matchParsedFhirQueryParams(subscription.parsedCriteria, resource)
    );
};

/**
 * This class matches DynamoDBStreamEvents against the active Subscriptions and publishes SNS messages for each match.
 */
// eslint-disable-next-line import/prefer-default-export
export class StreamSubscriptionMatcher {
    private readonly fhirSearchParametersRegistry: FHIRSearchParametersRegistry;

    private readonly persistence: Persistence;

    private readonly topicArn: string;

    private activeSubscriptions: AsyncRefreshCache<Subscription[]>;

    /**
     * @param persistence - Persistence implementation. Used to fetch the active Subscriptions
     * @param topicArn - arn of the SNS topic where notifications will be sent
     * @param options.fhirVersion - FHIR version. Used to determine how to interpret search parameters
     * @param options.compiledImplementationGuides - Additional search parameters from implementation guides
     */
    constructor(
        persistence: Persistence,
        topicArn: string,
        {
            fhirVersion = '4.0.1',
            compiledImplementationGuides,
        }: { fhirVersion?: FhirVersion; compiledImplementationGuides?: any } = {},
    ) {
        this.persistence = persistence;
        this.topicArn = topicArn;
        this.fhirSearchParametersRegistry = new FHIRSearchParametersRegistry(fhirVersion, compiledImplementationGuides);

        this.activeSubscriptions = new AsyncRefreshCache<Subscription[]>(async () => {
            logger.info('Refreshing cache of active subscriptions...');

            const activeSubscriptions: Subscription[] = (await this.persistence.getActiveSubscriptions({})).map(
                (resource) => parseSubscription(resource, this.fhirSearchParametersRegistry),
            );

            logger.info(`found ${activeSubscriptions.length} active subscriptions`);

            return activeSubscriptions;
        });
    }

    async match(dynamoDBStreamEvent: DynamoDBStreamEvent): Promise<void> {
        const eligibleResources = filterOutIneligibleResources(dynamoDBStreamEvent);
        const subscriptionNotifications: SubscriptionNotification[] = (await this.activeSubscriptions.get()).flatMap(
            (subscription) => {
                return eligibleResources
                    .filter((resource) => matchSubscription(subscription, resource))
                    .map((resource) => buildNotification(subscription, resource));
            },
        );

        logger.info(
            'Summary of notifications:',
            JSON.stringify(
                subscriptionNotifications.map((s) => ({
                    subscriptionId: s.subscriptionId,
                    resourceId: s.matchedResource.id,
                })),
            ),
        );

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const chunks: SubscriptionNotification[][] = chunk(subscriptionNotifications, SNS_MAX_BATCH_SIZE);
        // TODO: use publishBatch to send SNS messages.
    }
}
