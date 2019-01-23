import {ZapProvider} from "@zapjs/provider";
import {loadAccount, loadProvider, loadSubscriber} from "./util";
import {NULL_ADDRESS} from "@zapjs/types";
import {ZapSubscriber} from "@zapjs/subscriber";
import {ZapBondage} from "@zapjs/bondage"
import {CLI} from "./abstractCli";
const {fromWei,utf8ToHex,BN,numberToHex} = require("web3-utils")
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
            "Get Subscriber's Bound Zaps": {args: [], func: [this, 'getZapBound']},
            "Approve Provider": {args: [], func: [this,'approveProvider']},
            "Bond To Endpoint": {args: [], func: [this, 'bondToEndpoint']},
            "Unbond To Endpoint": {args: [], func: [this, 'unbondToEndpoint']},
            "Query": {args: [], func: [this, 'query']},
            "Cancel Query": {args: ["queryId"], func: [subscriber, "cancelQuery"]},
            "Start Subscription": {args: [], func: [this, "startSubscription"]},
            "End Subscription": {args:[], func: [this,"endSubscription"]},
            "Get Subsciption" : {args: [], func: [this, "getSubscription"]},
            "Get Starting Block" : {args: [], func: [this, "getBlockStart"]},
            "Get Ending Block" : {args: [], func: [this, "getBlockEnd"]}
        }
    }

    async query(){
        let [provider,endpoint] = await this.getProviderAndEndpoint()
        let query = await this.getInput("query")
        let endpointParams = await this.getParamsInput("Param")
        let tx = await this.subscriber.queryData({provider,query,endpoint,endpointParams})
        const _id = tx.events['Incoming'].returnValues['id'];
        const id = this.web3.utils.toBN(_id);
        console.log('Query ID generate was', '0x' + id.toString(16));

        // Create a promise to get response
        const promise: Promise<any> = new Promise((resolve: any, reject: any) => {
            console.log('Waiting for response');
            let fulfilled = false;

            // Get the off chain response
            this.subscriber.listenToOffchainResponse({ id }, (err: any, data: any) => {
                // Only call once
                if ( fulfilled ) return;
                fulfilled = true;

                // Output response
                if ( err ) reject(err);
                else       resolve(Object.values(data.returnValues).slice(Object.values(data.returnValues).length/2+3));
            });
        });

        const res = await promise;
        console.log('Response', res);
            return tx

    }


    async approveProvider(){
        const provider = await this.getInput("Provider's address: ")
        let zapNum = await this.getInput("Zap amount to approve:")
        if(!zapNum || zapNum==''){
            throw "Invalid Zap amount input"
        }
        const gasPrice = await this.getGasPrice()
        return await this.subscriber.approveToBond({provider,zapNum,gasPrice})
    }


    async bondToEndpoint(){
        let zapBalance = await this.subscriber.getZapBalance()
        if(parseInt(zapBalance.toString())==0) throw "0 Zap Balance, please deposit Zap and continue"
        let [provider,endpoint,providerObject] = await this.getProviderAndEndpoint()
        let dots = await this.getInput("Amount of Dots to bond")
        let requiredZap  = await providerObject.getZapRequired({endpoint,dots})
        const allow = await this.getInput(`Will cost ${fromWei(requiredZap)} ZAP, continue ? (y/n)`);
        if(!allow || allow == '' || allow.toLowerCase()=='n'){
            return "Abort Bonding"
        }
        if(zapBalance<requiredZap) throw `Not enough Zap balance, require ${fromWei(requiredZap)} Zap`
        const gasPrice = await this.getGasPrice()
        let bond = await this.subscriber.bond({provider,endpoint,dots,gasPrice})
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
        const gasPrice = await this.getGasPrice()
        let unbond = await this.subscriber.unBond({provider,endpoint,dots,gasPrice})
        return unbond
    }

    async getBoundDots(){
        let [provider,endpoint] = await this.getProviderAndEndpoint()
        let boundDots = await this.subscriber.getBoundDots({provider,endpoint})
        return boundDots
    }

    async getZapBound(){
        let [provider,endpoint] = await this.getProviderAndEndpoint()
        let boundZap = await this.subscriber.zapBondage.getZapBound({provider,endpoint})
        return fromWei(boundZap)
    }

    async startSubscription(){
        let [provider,endpoint] = await this.getProviderAndEndpoint()
        let dots:number|string = await this.getInput("Number of blocks(dots) of subscription")
        let endpointParams:string[] = []
        const gasPrice = await this.getGasPrice()
        let txid = await this.subscriber.subscribe({provider,endpoint,dots,endpointParams,gasPrice})
        return txid
    }

    async endSubscription(){
        let [provider,endpoint] = await this.getProviderAndEndpoint()
        let boundDots = await this.subscriber.zapArbiter.getDots({subscriber:this.subscriber.subscriberOwner,provider,endpoint:utf8ToHex(endpoint)})
        console.log("bound dots : ", boundDots)
        if(parseInt(boundDots.toString())==0){
            return "No active subscription"
        }
        const gasPrice = await this.getGasPrice()
        let txid = await this.subscriber.zapArbiter.endSubscriptionSubscriber({provider,endpoint,from:this.subscriber.subscriberOwner,gasPrice})
        return txid
    }

    async getSubscription(){
        let [provider,endpoint] = await this.getProviderAndEndpoint()
        return await this.subscriber.zapArbiter.getSubscription({provider,endpoint,subscriber:this.subscriber.subscriberOwner})
    }

    async getBlockStart(){
        let [provider,endpoint] = await this.getProviderAndEndpoint()
        return await this.subscriber.zapArbiter.getBlockStart({provider,endpoint,subscriber:this.subscriber.subscriberOwner})
    }

    async getBlockEnd(){
        let [provider,endpoint] = await this.getProviderAndEndpoint()
        return await this.subscriber.zapArbiter.getPreBlockEnd({provider,endpoint,subscriber:this.subscriber.subscriberOwner})
    }


}
