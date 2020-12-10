import { TypeSearchRequest } from 'fhir-works-on-aws-interface';
import {ElasticSearchService} from './elasticSearchService';

class ExecuteClass {

static async run() {
    console.log('Started the call');
    const elastic = new ElasticSearchService(); 
    const request:TypeSearchRequest = {
        resourceType: "Immunization",
        queryParams : {occurrenceDateTime : "sa2019-01-08", status : "completed"},
        baseUrl: "http:local:8000/test",
        allowedResourceTypes: ["Red", "Blue"]
    }
    try {
        const details =  await elastic.typeSearch(request);
        console.log(JSON.stringify(details));
    }catch(err){
        console.log(err);
        process.exit(1);
    }
    
 }
}
console.log('started executing');
ExecuteClass.run();
