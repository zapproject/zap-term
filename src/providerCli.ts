const {hexToUtf8,fromWei,toBN} = require("web3-utils");
const Util = require("./util")
const p  = require("inquirer");
p.registerPrompt('fuzzypath', require('inquirer-fuzzy-path'))
import {ZapProvider} from "@zapjs/provider";
import {ask} from "./util";
import {createCurve} from "./curve"
import {NULL_ADDRESS} from "@zapjs/types";
import {CLI} from "./abstractCli"
const IPFS = require("ipfs-mini")
const ipfs = new IPFS({host:'ipfs.infura.io',port:5001,protocol:'https'})
const IPFS_GATEWAY = "https://gateway.ipfs.io/ipfs/"
const fs = require("fs")
const path = require("path")


export class ProviderCli extends CLI {
    provider : ZapProvider
    constructor(web3:any,provider:ZapProvider) {
        super()
        this.provider = provider
        this.web3 = web3
        this.list = {
            "Get Current Provider's Info" : {args:[{web3},{address:this.provider.providerOwner}], func: [Util,"getProviderInfo"]},
            "Create Oracle": {args: [], func: [this,'initProvider']},
            "Set Title" :{args:[],func:[this,"setTitle"]},
            "Get Params": {args: [], func: [this, 'getAllProviderParams']},
            "Set Params": {args: ["key", "value"], func: [provider, 'setProviderParameter']},
            "Create IPFS file for Endpoint's info": {args:[],func: [this,"saveMDfileToipfs"]},
            "Initiate Endpoint": {args: [], func: [this, 'initProviderCurve']},
            "Clear Endpoint" :{args:[],func:[this,"clearEndpoint"]},
            "List Endpoints": {args: [], func: [this.provider, 'getEndpoints']},
            "Get Endpoint's Info" : {args:[], func: [this,"getEndpointInfo"]},
            "Get Endpoint Params": {args: [], func: [this, 'getEndpointParams']},
            "Set Endpoint Params": {args: [], func: [this, 'setEndpointParams']},
            "Save endpoint to ipfs":{args:[],func:[this,"saveEndpointIpfs"]},
            "Get Bound Dots Amount": {args: [], func: [this, 'getBoundDotsInfo']},
            "Get Bound Zaps Amount": {args: ["endpoint"], func: [provider, 'getZapBound']},
            "Unbond dots for Zap": {args:[],func:[this,"unbondDots"]},
            "Respond To Query": {args: [], func: [this, 'respondToQuery']},
            "Listen to Queries": {args: [], func: [this, 'listenQueries']}
        }
    }

    async unbondDots(){
      try{
        const endpoints = await this.provider.getEndpoints()
        const endpoint = await this.getChoice(endpoints)
        const boundDots = await this.provider.getBoundDots({endpoint,subscriber:this.provider.providerOwner})
        const dots = await this.getInput(`
          You have ${boundDots} dots bounds.
          How many do you want to unbond?`)
        if(parseInt(dots)<1){
          return "Amount of dots to unbond has to be > 1 "
        }
        if(parseInt(dots)> parseInt(boundDots.toString())){
          return "Bound dots is smaller than entered amount : "+boundDots
        }
        this.spinner.start()
        const gas = await this.getGasPrice()
        const txid = await this.provider.zapBondage.unbond({
          provider:this.provider.providerOwner,
          endpoint,
          dots,
          from:this.provider.providerOwner,
          gas
        })
        this.spinner.stop()
        return txid
      }
      catch(e){
        this.spinner.stop()
        return e
      }


    }

    async getBoundDotsInfo(){
      try{
        const endpoints = await this.provider.getEndpoints()
        const endpoint = await this.getChoice(endpoints)
        const bounddots = await this.provider.getBoundDots({endpoint:endpoint,subscriber:this.provider.providerOwner})
        return bounddots
      }catch(e){
        return e
      }
    }

    async setTitle(){
      try{
        const currentTitle = await this.provider.getTitle()
        if(!currentTitle || currentTitle==''){
            return "Provider is not initiated, cant set title"
        }
        const title = await this.getInput("Title")
        const gasPrice = await this.getGasPrice()
        this.spinner.start()
        let txid = await this.provider.setTitle({title,gasPrice})
        this.spinner.stop()
        return txid
      }catch(e){
        this.spinner.stop()
        return e
      }
    }


    async respondToQuery(){
      try{
        let queryId = await this.getInput("Query Id")
        let dynamic = false
        let responseParams = []
        let choice = await this.getChoice([
            'Dynamic (Any length, any type)',
            'Int Array',
            'String Array (up to 4)'
        ])
        switch(choice) {
            case 'Dynamic (Any length, any type)':
                dynamic = true
                responseParams = await this.getParamsInput("Response Param")
                break;
            case "Int Array":
                dynamic = true
                responseParams = await this.getParamsInput("Int Reponse")
                responseParams = responseParams.map(i=>{return parseInt(i)})
                break;
            case 'String Array (up to 4)':
                dynamic = false
                responseParams = await this.getParamsInput("String Param")
                break
            default:
                break
        }
        console.log("response : ", queryId,responseParams,dynamic)
        const gasPrice = await this.getGasPrice()
        this.spinner.start()
        let response = await this.provider.respond({queryId,responseParams,dynamic,gasPrice})
        this.spinner.stop()
        return response
      }catch(e){
        this.spinner.stop()
        return e
      }


    }

    async initProvider(args:any){
      try{
        let currentTitle = await this.provider.getTitle()
        if(currentTitle && currentTitle != ''){
            throw "Provider is already initiated"
        }
        let public_key = await this.getInput("Public Key : ")
        const title = await this.getInput("Title : ")
        const gasPrice = await this.getGasPrice()
        this.spinner.start()
        let txid =  await this.provider.initiateProvider({public_key,title,gasPrice})
        this.spinner.stop()
        return txid
      }catch(e){
        this.spinner.stop()
        return e
      }
    }

    async initProviderCurve():Promise<any>{
        let endpoint = await this.getInput("Endpoint")
        let endpoints = await this.provider.getEndpoints()
        if(endpoint == ''){
            return "Invalid Endpoint"
        }
        let broker = await this.getInput("Broker (empty for none)")
        if(broker == ''){
            broker=NULL_ADDRESS
        }
        if(endpoints.includes(endpoint)){
            return "Endpoint is already existed"
        }
        try
        {
            const curve = await createCurve()
            console.log("curve created : ", curve)
            const gasPrice = await this.getGasPrice()
            this.spinner.start()
            let txid =  await this.provider.initiateProviderCurve({endpoint,term:curve,broker,gasPrice})
            this.spinner.stop()
        }catch(e){
            this.spinner.stop()
            return "Error creating curve, please try again" + e
        }
    }


    async getEndpointInfo(){
        const endpoints = await this.provider.getEndpoints()
        const endpoint = await this.getChoice(endpoints)
        const curve = await this.provider.getCurve(endpoint)
        const broker = await this.provider.getEndpointBroker(endpoint)
        const zapBound = await this.provider.getZapBound(endpoint)
        const params = await this.provider.getEndpointParams(endpoint)
        const maxDots = await this.provider.getDotsLimit(endpoint)
        const issuedDots = await this.provider.getDotsIssued(endpoint)
        console.log(`Curve : ${curve.values}\n Broker : ${broker}\n Params: ${params}\n Max Dots: ${maxDots}\n Zap Bound: ${fromWei(zapBound)}\n Dots Issued: ${issuedDots}`);

    }

    async clearEndpoint(){
      try{
        const endpoints = await this.provider.getEndpoints()
        const endpoint = await this.getChoice(endpoints)
        const gasPrice = await this.getGasPrice()
        this.spinner.start()
        const txid = await this.provider.clearEndpoint({endpoint,gasPrice})
        this.spinner.stop()
        return txid
      }catch(e){
        this.spinner.stop()
        return e
      }
    }

    async getEndpointParams(){
        let endpoints = await this.provider.getEndpoints()
        let e = await this.getChoice(endpoints)
        return await this.provider.getEndpointParams(e)
    }

    async setEndpointParams(){
      try{
        let endpoints = await this.provider.getEndpoints()
        let endpoint = await this.getChoice(endpoints)
        let endpoint_params = await this.getParamsInput("Endpoint Param")
        const gasPrice = await this.getGasPrice()
        this.spinner.start()
        let setParams = await this.provider.setEndpointParams({endpoint,endpoint_params,gasPrice})
        this.spinner.stop()
        return setParams
      }catch(e){
        this.spinner.stop()
        return e
      }
    }
    async saveEndpointIpfs(){
        try {
            let endpoints = await this.provider.getEndpoints()
            let endpoint = await this.getChoice(endpoints)
            let params = await this.provider.getEndpointParams(endpoint)
            let ipfs_info: any = {}
            ipfs_info.name = endpoint
            ipfs_info.curve = await this.provider.getCurve(endpoint)
            ipfs_info.broker = await this.provider.getEndpointBroker(endpoint)
            ipfs_info.params = params
            // console.log("ipfs info : ", ipfs_info)
            let hash = await this.saveToIPFS(JSON.stringify(ipfs_info))
            console.log("saved ipfs ", hash)
            console.log("Ipfs link is created, saving to provider's param")
            //save to provider's param
            this.spinner.start()
            let txid = await this.provider.setProviderParameter({key: endpoint, value: IPFS_GATEWAY + hash})
            this.spinner.stop()
            return `Saved ipfs link to provider's param, txid : ${JSON.stringify(txid)}\n Check out at ${IPFS_GATEWAY + hash}`
        }catch(e){
          this.spinner.stop()
            return e
        }
    }

    async saveToIPFS(data:string){
        return new Promise((resolve,reject)=>{
            const ipfs = new IPFS({host:'ipfs.infura.io',port:5001,protocol:'https'})
            ipfs.add(data,(err:any,res:any)=>{
                if(err) reject(err)
                else resolve(res)
            })
        })
    }
    async saveMDfileToipfs(){
        let endpoints = await this.provider.getEndpoints()
        let endpoint  = await this.getChoice(endpoints)
        let saved = false
        let content = await this.getInput(`
        Enter information about this endpoint,
        This information will be saved on ipfs
        ipfs link will be saved as Endpoint's parameters`)
        let hash = await this.saveToIPFS(content.toString())
        console.log(`Saved content to ipfs ${hash}, saving link to provider's param...`)
        this.spinner.start()
        let txid = await this.provider.setProviderParameter({key:`${endpoint}.md`,value:IPFS_GATEWAY+hash})
        this.spinner.stop()
        console.log("Saved md link to provider param, check it out at : ",IPFS_GATEWAY+hash)
        saved = true
        return txid

        if(!saved){
            return "Failed to save file to ipfs and provider's param : "
        }
        return endpoint

    }


    async getAllProviderParams(){
        let keys = await this.provider.getAllProviderParams()
        let providerParams :{[key:string]:string}= {}
        for(let key of keys){
            key = hexToUtf8(key)
            let param = await this.provider.getProviderParam(key)
            providerParams[key] = hexToUtf8(param)
        }
        return providerParams
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
        let waiting = 'y'
        while ( waiting.toLowerCase()=='y' ) {
            let waiting = await this.getInput("Waiting for next queries ? y/n")
            if(!["y","n"].includes(waiting.toLowerCase())){
                console.log("valid inputs : y n ")
                continue
            }
            if(waiting.toLowerCase()=="n"){
                return "Done waiting for queries"
            }
            console.log('Waiting for the next query...');
            const data: any = await nextQuery();
            console.log(`Query [${this.web3.utils.hexToUtf8(data.endpoint)}]: ${data.query}`);
            let dynamic = false
            let responseParams = []
            let choice = await this.getChoice([
                'Dynamic (Any length, any type)',
                'Int Array',
                'String Array (up to 4)'
            ])
            switch(choice) {
                case 'Dynamic (Any length, any type)':
                    dynamic = true
                    responseParams = await this.getParamsInput("Response Param")
                    break;
                case "Int Array":
                    dynamic = true
                    responseParams = await this.getParamsInput("Int Reponse")
                    responseParams = responseParams.map(i=>{return parseInt(i)})
                    break;
                case 'String Array (up to 4)':
                    dynamic = false
                    responseParams = await this.getParamsInput("String Param")
                    break;
                default:
                    break
            }
            console.log("response : ", data.id,responseParams,dynamic)
            this.provider.respond({queryId:data.id,responseParams,dynamic})
            continue
        }
        return "Done"
    }






}
