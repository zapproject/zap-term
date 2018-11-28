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
            "Get Subscriber's Bound Dots": {args: [], func: [this, 'getBoundDots']},
            "Get Subscriber's Bound Zaps": {args: ["provider", "endpoint"], func: [bondage, 'getZapBound']},
            "Bond To Endpoint": {args: [], func: [this, 'bondToEndpoint']},
            "Unbond To Endpoint": {args: [], func: [this, 'unbondToEndpoint']},
            "Query": {args: [], func: [this, 'query']},
            "Cancel Query": {args: ["queryId"], func: [subscriber, "cancelQuery"]}
        }
    }

    async query(){
        let [provider,endpoint] = await this.getProviderAndEndpoint()
        let query = await this.getInput("query")
        let endpointParams = await this.getParamsInput("Param")
        let tx = await this.subscriber.queryData({provider,query,endpoint,endpointParams})
        return tx

    }
    async bondToEndpoint(){
        let zapBalance = await this.subscriber.getZapBalance()
        if(parseInt(zapBalance.toString())==0) throw "0 Zap Balance, please deposit Zap and continue"
        let [provider,endpoint,providerObject] = await this.getProviderAndEndpoint()
        let dots = await this.getInput("Amount of Dots to bond")
        let requiredZap  = await providerObject.getZapRequired({endpoint,dots})
        if(zapBalance<requiredZap) throw "Not enough Zap balance"
        let bond = await this.subscriber.bond({provider,endpoint,dots})
        return bond
    }
    async unbondToEndpoint(){
        let [provider,endpoint] = await this.getProviderAndEndpoint()
        let boundDots = await this.subscriber.getBoundDots({provider,endpoint})
         if(boundDots==0){
            throw `You have 0 dots bond to ${endpoint}`
        }
        console.log(typeof boundDots)
        let dots = await this.getInput(`You have ${boundDots} bound dots\n
        Enter amount of dots to unbond`)
        if(parseInt(dots)==0){
            throw "Cant unbond 0 dots"
        }
        let unbond = await this.subscriber.unBond({provider,endpoint,dots})
        return unbond
    }

    async getBoundDots(){
        let [provider,endpoint] = await this.getProviderAndEndpoint()
        let boundDots = await this.subscriber.getBoundDots({provider,endpoint})
        return boundDots
    }



}