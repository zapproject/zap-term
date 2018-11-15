import {ZapRegistry} from "@zapjs/registry";

const p  = require("inquirer");
import {createProvider, createProviderCurve,doQuery,doResponses,getEndpointInfo}  from "./provider"
const Util = require("./util")
import {loadAccount,loadProvider,loadSubscriber,ask} from "./util";
import {ZapProvider} from "@zapjs/provider";
import {ZapSubscriber} from "@zapjs/subscriber";
import {ZapDispatch} from "@zapjs/dispatch";
import {ZapBondage} from "@zapjs/bondage"
const HDWalletProviderMem = require("truffle-hdwallet-provider");
const Web3 = require('web3');
const emptyWallet = new Web3("wss://kovan.infura.io/_ws")
let provider,subscriber;

const providerChoices = ['Create Oracle','Initiate Endpoint','List Endpoints',"Get Provider's Bound Dots","Get Provider's Bound Zaps",
    'Get Endpoint Params','Set Endpoint Params','Get Params','Set Params','Respond To Query',"Listen to Queries" ]
const subscriberChoices =  [ "Get Subscriber's Bound Dots",'Bond To Endpoint','Unbond To Endpoint',
    'Get  Bound Dots','Query','Cancel Query' ]
const generalChoices = [ 'Get my info','List Oracles','Get Oracle Info','Get Query Status','Calculate Required Zap' ,"Get Bound Dots", "Get Bound Zaps"]
const templateChoices = [ 'Create Onchain Subscriber Bootstrap','Create Offchain Subcriber Bootstrap','Create  Oracle Template' ]
const mainChoices = ["General","I'm Provider","I'm Subscriber","create Template", "Exit"]

let funcList : {[key:string]:any}
function getFuncList(provider:ZapProvider,subscriber:ZapSubscriber,registry:ZapRegistry,dispatch:ZapDispatch,bondage:ZapBondage,web3:any) {
    const funcList: { [key: string]: any } = {
        "Create Oracle": {args: ["public_key", "title"], func: [provider, 'initiateProvider']},
        "Initiate Endpoint": {args: ["endpoint", "term","broker"], func: [provider,'initiateProviderCurve']},
        "List Endpoints": {args: [], func: [provider,'getEndpoints']},
        "Get Provider's Bound Dots": {args: ["endpoint", "subscriber"], func: [provider,'getBoundDots']},
        "Get Provider's Bound Zaps": {args: ["endpoint"], func: [provider,'getZapBound']},
        "Get Subscriber's Bound Dots": {args: ["provider","endpoint"], func: [subscriber,'getBoundDots']},
        "Get Bound Dots": {args: ["provider","endpoint", "subscriber"], func: [provider,'getBoundDots']},
        "Get Bound Zaps": {args: ["provider","endpoint"], func: [bondage,'getZapBound']},
        "Get Endpoint Params": {args: ["endpoint"], func: [provider,'getEndpointParams']},
        "Set Endpoint Params": {args: ["endpoint", "endpoint_params"], func: [provider,'setEndpointParams']},
        "Get Params": {args: [], func: [provider,'getAllProviderParams']},
        "Set Params": {args: ["key", "value"], func: [provider,'setProviderParameter']},
        "Respond To Query": {args: ['queryId',"responseParams","dynamic"], func:[provider,'respond']},
        "Listen to Queries":{args:[{provider:provider.providerOwner}],func:[provider,'listenQueries']},
        "Bond To Endpoint": {args: ["provider", "endpoint",'dots'], func: [subscriber,'bond']},
        "Unbond To Endpoint": {args: ["provider", "endpoint","dots"], func: [subscriber,'unBond']},
        "Query": {args: ["provider", "endpoint","query","endpointParams"], func: [subscriber,'queryData']},
        "Cancel Query": {args: ["queryId"], func: [subscriber,"cancelQuery"]},
        "Create Onchain Subscriber Bootstrap": {args: ["publicKey", "name"], func: createProvider},
        "Create Offchain Subcriber Bootstrap": {args: ["publicKey", "name"], func: createProvider},
        "Create  Oracle Template": {args: ['web3'], func: [Util,'viewInfo']},
        "Get my info": {args: [web3], func: [Util,'viewInfo']},
        "List Oracles": {args: [], func: [registry, 'getAllProviders']},
        "Get Oracle Info": {args: ["provider"], func: [Util, 'getProviderInfo']},
        "Get Query Status": {args: ["queryId"], func: [dispatch,'getStatus']},
        "Calculate Required Zap": {args: ["provider", "endpoint","dots"], func: [bondage,'calcZapForDots']},
        "General": {args: generalChoices, func: 'getChoice', choice: true},
        "I'm Provider": {args: providerChoices, func: 'getChoice', choice: true},
        "I'm Subscriber": {args: subscriberChoices, func: 'getChoice', choice: true},
        "Create Template": {args: templateChoices, func: 'getChoice', choice: true},
        "Exit": {args: process.exit, func: undefined}
    }
    return funcList
}
    async function main() {
        //Load the mnemonic and web3 instance
        const mnemonic = await ask('Whats your mnemonic (empty entry will use blank mnemonic): ');
        const web3: any = new Web3(new HDWalletProviderMem(mnemonic, "wss://kovan.infura.io/_ws"));

        // Get the provider and zap packages
        let registry = new ZapRegistry({networkId:42,networkProvider:emptyWallet})
        let dispatch = new ZapDispatch({networkId:42,networkProvider:emptyWallet})
        let bondage = new ZapBondage({networkId:42,networkProvider:emptyWallet})
        provider = await loadProvider(web3, await loadAccount(web3));
        subscriber = await loadSubscriber(web3, await loadAccount(web3));
        funcList = getFuncList(provider,subscriber,registry,dispatch,bondage,web3)
        console.log(await Util.viewInfo(web3))
        await getMenu(mainChoices)
    }

    async function getMenu(choices: string[]) {
        let res = await getChoice(choices)
        let choice = res['res']
        await executeFunction(choice);
    }

    async function executeFunction(choice: string): Promise<void> {
        if (!Object.keys(funcList).includes(choice)) {
            console.log("invalid choice")
            process.exit(1)
        }
        let func = funcList[choice].func
        let args = funcList[choice].args
        let ch = funcList[choice].choice
        if (!func) {
            console.log("Good bye")
            process.exit(0)
        }
        if (!!ch) {
            //this mean we are heading to another sub menu

            let res = await getChoice(args)
            return executeFunction(res['res'])
        }
        else {
            let res
            if (args.length > 0) {
                //prompt for more info
                let ans:{[key:string]:any} = await getInput(args)
                let answers
                if(ans.length>0){
                    answers = ans[0]
                }
                console.log(answers)
                for(let key of Object.keys(answers)){
                    if(key=="term"){
                        answers[key] = JSON.parse(answers[key])
                    }
                    answers[key] = answers[key]==''? null: answers[key]
                }
                res = await func[0][func[1]](answers)
            } else {
                try {
                    res = await
                    func[0][func[1]]()
                } catch (e) {
                    console.error(e)
                }
            }
            console.log(res ? "Result : "+ res : '')
            return getMenu(mainChoices)

        }
        process.exit(0)
    }

    async function getInput(questions: string[]|any[]) {
        let inqueries = []
        let answers = []
        for (let q of questions) {
            if((typeof q) =='string') {
                let inQ: any = {type: 'input'}
                inQ.name = q
                inQ.message = q
                inqueries.push(inQ)
            }else{
                answers.push(q)
            }
        }
         answers.push(await p.prompt(inqueries))
        return answers

    }

    function getChoice(options: string[]) {
        const promptList = {
            type: 'list',
            name: "res",
            message: " Choices ",
            choices: options
        }
        return p.prompt(promptList)
    }
main()
    .then(console.log)
    .catch(console.error)