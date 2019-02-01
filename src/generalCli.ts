import {ZapRegistry} from "@zapjs/registry";

const Util = require("./util")
const p  = require("inquirer");
import {ZapProvider} from "@zapjs/provider";
import {ask, loadAccount, loadProvider, loadSubscriber} from "./util";
import {NULL_ADDRESS} from "@zapjs/types";
import {CLI} from "./abstractCli"
import {createProvider} from "./provider";
import {ZapBondage} from "@zapjs/bondage";
import {ZapDispatch} from "@zapjs/dispatch";

export class GeneralCli extends CLI {
    bondage:ZapBondage
    dispatch:ZapDispatch
    registry:ZapRegistry
    constructor(web3:any,registry:ZapRegistry,bondage:ZapBondage,dispatch:ZapDispatch) {
        super()
        this.web3 = web3
        this.bondage = bondage
        this.dispatch = dispatch
        this.registry = registry
        this.list = {
            "List Oracles": {args: [], func: [registry, 'getAllProviders']},
            "Get Oracle Info": {args: [{web3},"address"], func: [Util, 'getProviderInfo']},
            "Get Query Status": {args: ["queryId"], func: [dispatch, 'getStatus']},
            "Calculate Required Zap": {args: [], func: [this, 'calcRequiredZap']},
            "Get Bound Dots":{args:[],func:[this,'getBoundDots']},
            "Get Bound Zap":{args:[],func:[this,'getBoundZap']},
            "Get Dots Limit" : {args: [],func:[this,"getDotsLimit"]},
        }
    }

    async getBoundDots(){
        let [provider,endpoint,p] = await this.getProviderAndEndpoint()
        let subscriber = await this.getInput("Subscriber")
        return await this.bondage.getBoundDots({subscriber,provider,endpoint})
    }
    async getBoundZap(){
        let [provider,endpoint,p] = await this.getProviderAndEndpoint()
        return await this.bondage.getZapBound({provider,endpoint})
    }
    async calcRequiredZap(){
        let [provider,endpoint,p] = await this.getProviderAndEndpoint()
        let dots = await this.getInput("Dots")
        return await this.bondage.calcZapForDots({provider,endpoint,dots})
    }
    async getDotsLimit(){
        let [provider,endpoint,p] = await this.getProviderAndEndpoint()
        return await this.bondage.getDotsLimit({provider,endpoint})
    }





}
