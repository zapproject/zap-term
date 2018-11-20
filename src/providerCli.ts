
const Util = require("./util")
const p  = require("inquirer");
import {ZapProvider} from "@zapjs/provider";
import {ask, loadAccount, loadProvider, loadSubscriber} from "./util";
import {NULL_ADDRESS} from "@zapjs/types";
import {CLI} from "./abstractCli"

export class ProviderCli extends CLI {
    provider : ZapProvider
    web3: any
    list : {[key:string]:any}
    constructor(web3:any,provider:ZapProvider) {
        super()
        this.provider = provider
        this.web3 = web3
        this.list = {
            "Get Current Provider's Info" : {args:[{web3},{address:this.provider.providerOwner}], func: [Util,"getProviderInfo"]},
            "Create Oracle": {args: ["public_key", "title"], func: [this,'initProvider']},
            "Initiate Endpoint": {args: ["endpoint", "term", "broker"], func: [this, 'initProviderCurve']},
            "List Endpoints": {args: [], func: [this.provider, 'getEndpoints']},
            "Get Provider's Bound Dots": {args: ["endpoint", "subscriber"], func: [provider, 'getBoundDots']},
            "Get Provider's Bound Zaps": {args: ["endpoint"], func: [provider, 'getZapBound']},
            "Get Endpoint Params": {args: [], func: [this, 'getEndpointParams']},
            "Set Endpoint Params": {args: ["endpoint_params"], func: [this, 'setEndpointParams']},
            "Get Params": {args: [], func: [provider, 'getAllProviderParams']},
            "Set Params": {args: ["key", "value"], func: [provider, 'setProviderParameter']},
            "Respond To Query": {args: ['queryId', "responseParams", "dynamic"], func: [provider, 'respond']},
            "Listen to Queries": {args: [], func: [this, 'listenQueries']}
        }
    }


    async initProvider(args:any){
        let title = await this.provider.getTitle()
        let inputs = await this.getInput(args);
        if(title && title != ''){
            throw "Provider is already initiated"
        }
        else{
            return await this.provider.initiateProvider(args)
        }
    }

    async initProviderCurve(args:any):Promise<any>{
        let endpoints = await this.provider.getEndpoints()
        if(args['endpoint']==''){
            throw "Invalid Endpoint"
        }
        if(args['broker']==''){
            args['broker']=NULL_ADDRESS
        }
        if(endpoints.includes(args['endpoint'])){
            throw "Endpoint is already existed"
        }
        try
        {
            args['term'] = JSON.parse(args['term'])
        }catch(e){
            throw "Invalid term, please enter Array format , example: [1,1,100000]"
        }
            return await this.provider.initiateProviderCurve(args)
    }

    async getEndpointParams(){
        let endpoints = await this.provider.getEndpoints()
        let e = await this.getChoice(endpoints)
        return await this.provider.getEndpointParams(e)
    }

    async setEndpointParams(){
        let endpoints = await this.provider.getEndpoints()
        let e = await this.getChoice(endpoints)
        let params = []
        let inp:string|any = ''
        do {
            inp = await p.prompt({
                type:'input',
                name:'res',
                message : 'Param (empty to finish) : '
            })
            inp = inp['res']
            if(inp!=''){
                params.push(inp)
            }
        }while(inp!='')
        let args = {endpoint:e,endpoint_params:params}
        let setParams = await this.provider.setEndpointParams(args)
        return setParams
    }

    async listenQueries() {
        // Queries that need to be answered
        const unanswered: any[] = [];

        const nextQuery = () => {
            return new Promise((resolve, reject) => {
                let fulfilled = false;
                this.provider.listenQueries({}, (err: any, data: any) => {
                    // Only call once
                    if ( fulfilled ) return;
                    fulfilled = true;

                    // Output response
                    if ( err ) reject(err);
                    else resolve(data.returnValues);
                });
            });
        };

        while ( true ) {
            console.log('Waiting for the next query...');
            const data: any = await nextQuery();
            console.log(`Query [${this.web3.utils.hexToUtf8(data.endpoint)}]: ${data.query}`);
            const res: string = await ask('Response> ');
            const tx: string | any = await this.provider.respond({
                queryId: data.id,
                responseParams: [res],
                dynamic: true
            });

            return tx
        }
    }






}