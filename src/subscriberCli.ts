import {ZapProvider} from "@zapjs/provider";
import {loadAccount, loadProvider, loadSubscriber} from "./util";
import {NULL_ADDRESS} from "@zapjs/types";
import {ZapSubscriber} from "@zapjs/subscriber";
import {ZapBondage} from "@zapjs/bondage"
import {CLI} from "./abstractCli";
export class SubscriberCli extends CLI{
    subscriber : ZapSubscriber
    web3: any
    list : {[key:string]:any}
    constructor(web3:any,subscriber:ZapSubscriber,bondage:ZapBondage) {
        super()
        this.subscriber = subscriber
        this.web3 = web3
        this.list = {
            "Get Subscriber's Bound Dots": {args: ["provider"], func: [subscriber, 'getBoundDots']},
            "Get Subscriber's Bound Zaps": {args: ["provider", "endpoint"], func: [bondage, 'getZapBound']},
            "Bond To Endpoint": {args: ["provider", "endpoint", 'dots'], func: [subscriber, 'bond']},
            "Unbond To Endpoint": {args: ["provider", "endpoint", "dots"], func: [subscriber, 'unBond']},
            "Query": {args: ["provider", "endpoint", "query", "endpointParams"], func: [subscriber, 'queryData']},
            "Cancel Query": {args: ["queryId"], func: [subscriber, "cancelQuery"]}
        }
    }

    async bondToEndpoint({provider}:any){

    }



}