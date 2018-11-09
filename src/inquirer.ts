const p  = require("inquirer").prompt;
import {createProvider, createProviderCurve,doQuery,doResponses,getEndpointInfo}  from "./provider"
import {doBondage,doUnbondage,listOracles,viewInfo} from "./subscriber"
async function main(){
    const providerChoices = {
        "Initiate Oracle" : {args :["publicKey","name"],func :createProvider},
        "Initiate Endpoint" : createProviderCurve,
        "List Endpoints" : ()=>{},
        "Get Bound Dots" : ()=>{},
        "Get Bound Zap" : ()=>{},
        "Get Endpoint Params" : ()=>{},
        "Set Endpoint Params" : ()=>{},
        "Get Params" : ()=>{},
        "Set Params" : ()=>{},
        "Respond To Query" : ()=>{}
    }

    const subscriberChoices = {
        "Get Bound Dots" : ()=>{},
        "Get Bound Zap" : ()=>{},
        "Bond To Endpoint" : ()=>{},
        "Unbond To Endpoint" : ()=>{},
        "Get Bound Zap/Dots" : ()=>{},
        "Query" : ()=>{},
        "Cancel Query" : ()=>{}
    }

    const templateChoices = {
        "Create Onchain Subscriber Bootstrap" : ()=>{},
        "Create Offchain Subcriber Bootstrap" : ()=>{},
        "Create  Oracle Template" : ()=>{}
    }

    const generalChoices = {
        "Get my info" : ()=>{},
        "List Oracle" : ()=>{},
        "Get Oracle Info" : ()=>{},
        "Get Query Status" : ()=>{},
        "Calculate Required Zap" : ()=>{}
    }
    const mainChoices = {
        "General" : ,
        "Provider",
        "Subscriber",
        "Template",
        "Exit" : process.exit
    }

}


function getChoice(options : string[]){
    const promptList = {
        type: 'list',
        name: "res",
        message: " Choices ",
        choices: options
    }
    return p(promptList)
}
function exitOrBack(option:string){
    switch (option) {
        case "Exit":
            console.log("Good bye")
            process.exit(0)
        default :
            return

    }
}

main()
.then(console.log)
.catch(console.error)