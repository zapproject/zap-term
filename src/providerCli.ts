const {hexToUtf8} = require("web3-utils");
const Util = require("./util")
const p  = require("inquirer");
import {ZapProvider} from "@zapjs/provider";
import {ask} from "./util";
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
            "Create Oracle": {args: ["public_key", "title"], func: [this,'initProvider']},
            "Initiate Endpoint": {args: ["endpoint", "term", "broker"], func: [this, 'initProviderCurve']},
            "List Endpoints": {args: [], func: [this.provider, 'getEndpoints']},
            "Get Provider's Bound Dots": {args: ["endpoint", "subscriber"], func: [provider, 'getBoundDots']},
            "Get Provider's Bound Zaps": {args: ["endpoint"], func: [provider, 'getZapBound']},
            "Get Endpoint Params": {args: [], func: [this, 'getEndpointParams']},
            "Set Endpoint Params": {args: [], func: [this, 'setEndpointParams']},
            "Get Params": {args: [], func: [this, 'getAllProviderParams']},
            "Get Param": {args: [], func: [this, 'getProviderParam']},
            "Set Params": {args: ["key", "value"], func: [provider, 'setProviderParameter']},
            "Save endpoint to ipfs":{args:[],func:[this,"saveEndpointIpfs"]},
            "Save .md file to ipfs": {args:[],func: [this,"saveMDfileToipfs"]},
            "Respond To Query": {args: [], func: [this, 'respondToQuery']},
            "Listen to Queries": {args: [], func: [this, 'listenQueries']}
        }
    }

    async respondToQuery(){
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
                break;
            default:
                break
        }
        console.log("response : ", queryId,responseParams,dynamic)
        let response = await this.provider.respond({queryId,responseParams,dynamic})
        return response


    }

    async initProvider(args:any){
        let title = await this.provider.getTitle()
        let inputs:any = await this.getInputs(args);
        if(title && title != ''){
            throw "Provider is already initiated"
        }
        else{
            return await this.provider.initiateProvider(inputs)
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
        let params = await this.getParamsInput("Endpoint Param")
        let args = {endpoint:e,endpoint_params:params}
        let setParams = await this.provider.setEndpointParams(args)
        return setParams
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
            let txid = await this.provider.setProviderParameter({key: endpoint, value: IPFS_GATEWAY + hash})
            return `Saved ipfs link to provider's param, txid : ${JSON.stringify(txid)}\n Check out at ${IPFS_GATEWAY + hash}`
        }catch(e){
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
        let files = await fs.readdirSync(path.join(__dirname,"../md"))
        if(files.length==0){
            return `Cant find ${endpoint}.md file to load, make sure you include it in md folder`
        }
        for(let file of files){
            if(file == `${endpoint}.md`){
                console.log(`saving file ${file}`)
                let content = await fs.readFileSync(path.join(__dirname,"../md",file))
                console.log(content.toString())
                let hash = await this.saveToIPFS(content.toString())
                console.log(`Saved content to ipfs ${hash}, saving link to provider's param...`)
                let txid = await this.provider.setProviderParameter({key:`${endpoint}.md`,value:IPFS_GATEWAY+hash})
                console.log("Saved md link to provider param, check it out at : ",IPFS_GATEWAY+hash)
                return txid
            }
        }
        return endpoint

    }


    async getProviderParam(){
        let key = await this.getInput("key")
        let param = await this.provider.getProviderParam(key)
        return hexToUtf8(param)
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