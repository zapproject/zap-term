const p  = require("inquirer");
import {createProvider, createProviderCurve,doQuery,doResponses,getEndpointInfo}  from "./provider"
import {doBondage,doUnbondage,listOracles,viewInfo} from "./subscriber"
import {loadAccount,loadProvider,loadSubscriber,ask} from "./util";
const HDWalletProviderMem = require("truffle-hdwallet-provider");
const Web3 = require('web3');

const providerChoices = ['Initiate Oracle','Initiate Endpoint','List Endpoints','Get Bound Dots','Get Bound Zap',
    'Get Endpoint Params','Set Endpoint Params','Get Params','Set Params','Respond To Query' ]
const subscriberChoices =  [ 'Get Bound Dots','Get Bound Zap','Bond To Endpoint','Unbond To Endpoint',
    'Get Bound Zap/Dots','Query','Cancel Query' ]
const generalChoices = [ 'Get my info','List Oracle','Get Oracle Info','Get Query Status','Calculate Required Zap' ]
const templateChoices = [ 'Create Onchain Subscriber Bootstrap','Create Offchain Subcriber Bootstrap','Create  Oracle Template' ]
const mainChoices = ["General","Provider","Subscriber","Exit"]
const funcList :{[key:string]:any}= {
    "Initiate Oracle" : {args :["publicKey","name"],func :createProvider},
    "Initiate Endpoint" :{args :["publicKey","name"],func :createProvider},
    "List Endpoints" : {args :["publicKey","name"],func :createProvider},
    "Get Bound Dots" : {args :["publicKey","name"],func :createProvider},
    "Get Bound Zap" : {args :["publicKey","name"],func :createProvider},
    "Get Endpoint Params" : {args :["publicKey","name"],func :createProvider},
    "Set Endpoint Params" : {args :["publicKey","name"],func :createProvider},
    "Get Params" :{args :["publicKey","name"],func :createProvider},
    "Set Params" : {args :["publicKey","name"],func :createProvider},
    "Respond To Query" : {args :['web3'],func :viewInfo},
    "Bond To Endpoint" : {args :["publicKey","name"],func :createProvider},
    "Unbond To Endpoint" : {args :["publicKey","name"],func :createProvider},
    "Get Bound Zap/Dots" : {args :["publicKey","name"],func :createProvider},
    "Query" : {args :["publicKey","name"],func :createProvider},
    "Cancel Query" : {args :["publicKey","name"],func :createProvider},
    "Create Onchain Subscriber Bootstrap" : {args :["publicKey","name"],func :createProvider},
    "Create Offchain Subcriber Bootstrap" :{args :["publicKey","name"],func :createProvider},
    "Create  Oracle Template" :{args :['web3'],func :viewInfo},
    "Get my info" :{args :['web3'],func :viewInfo},
    "List Oracle" : {args :["publicKey","name"],func :createProvider},
    "Get Oracle Info" : {args :["publicKey","name"],func :createProvider},
    "Get Query Status" : {args :["publicKey","name"],func :createProvider},
    "Calculate Required Zap" :{args :["publicKey","name"],func :createProvider},
    "General": {args: generalChoices, func: getChoice, choice: true},
    "Provider": {args: providerChoices, func: getChoice,choice: true},
    "Subscriber": {args: subscriberChoices, func: getChoice,choice: true},
    "Template": {args: templateChoices, func: getChoice,choice: true},
    "Exit": {args: process.exit, func:undefined}
}

async function main(){
    //Load the mnemonic and web3 instance
    const mnemonic = await ask('Whats your mnemonic (empty entry will use blank mnemonic): ');
    const web3: any = new Web3(new HDWalletProviderMem(mnemonic, "wss://kovan.infura.io/_ws"));
    console.log('Using address', await loadAccount(web3));

    // Get the provider and contracts
    const provider = await loadProvider(web3, await loadAccount(web3));
    const subscriber = await loadSubscriber(web3, await loadAccount(web3));
    let res = await getChoice(mainChoices)
    let choice = res['res']
    await executeFunction(choice);

}
async function executeFunction(choice:string){
    if(!Object.keys(funcList).includes(choice)){
        console.log("invalid choice")
        process.exit(1)
    }
    let func = funcList[choice].func
    let args = funcList[choice].args
    let ch = funcList[choice].choice
    if(!func){
        console.log("Good bye")
        process.exit(1)
    }
    if(!!ch){
         let res = await funcList[choice].func(args)
        executeFunction(res['res'])
    }
    else{
        //prompt for more info
        console.log("prompt for more info")
        let answers = await getInput(args)
        console.log(answers)
    }
    // process.exit(0)
}
async function getInput(questions:string[]){
    let inqueries = []
    for(let q of questions){
        let inQ:any = {type:'input'}
        inQ.name=q
        inQ.message = q
        inqueries.push(inQ)
    }
    return p.prompt(inqueries)

}
function getChoice(options : string[]){
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