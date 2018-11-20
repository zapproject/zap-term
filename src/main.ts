import {ZapRegistry} from "@zapjs/registry";
const p  = require("inquirer");
import {createProvider, createProviderCurve,doQuery,doResponses,getEndpointInfo}  from "./provider"
const Util = require("./util")
import {loadAccount,loadProvider,loadSubscriber,ask} from "./util";
import {ZapProvider} from "@zapjs/provider";
import {ZapSubscriber} from "@zapjs/subscriber";
import {ZapDispatch} from "@zapjs/dispatch";
import {ZapBondage} from "@zapjs/bondage"
import {NULL_ADDRESS} from "@zapjs/types";
import {ProviderCli} from "./providerCli";
import {SubscriberCli} from "./subscriberCli";
import {CLI} from "./abstractCli";

const HDWalletProviderMem = require("truffle-hdwallet-provider");
const Web3 = require('web3');
const emptyWallet = new Web3("wss://kovan.infura.io/_ws")

const generalChoices = [ 'Get my info','List Oracles','Get Oracle Info','Get Query Status','Calculate Required Zap' ,"Get Bound Dots", "Get Bound Zaps"]
const templateChoices = [ 'Create Onchain Subscriber Bootstrap','Create Offchain Subcriber Bootstrap','Create  Oracle Template' ]
const mainChoices = ["General","I'm Provider","I'm Subscriber","create Template", "Exit"]

export class Main extends CLI{
    funcList: { [key: string]: any }|undefined
    provider : ZapProvider | undefined
    subscriber : ZapSubscriber | undefined
    providerCli: ProviderCli | undefined
    subscriberCli : SubscriberCli | undefined;
    providerChoices: string[]
    subscriberChoices:string[]
    constructor(){
        super()
        this.provider = undefined;
        this.subscriber = undefined;
        this.providerCli = undefined;
        this.subscriberCli = undefined;
        this.providerChoices = []
        this.subscriberChoices = []
    }

    getFuncList(provider: ZapProvider, subscriber: ZapSubscriber, registry: ZapRegistry, dispatch: ZapDispatch, bondage: ZapBondage, web3: any) {
        this.list = {
            "Create Onchain Subscriber Bootstrap": {args: ["publicKey", "name"], func: createProvider},
            "Create Offchain Subcriber Bootstrap": {args: ["publicKey", "name"], func: createProvider},
            "Create  Oracle Template": {args: ['web3'], func: [Util, 'viewInfo']},
            "Get my info": {args: [{web3}], func: [Util, 'viewInfo']},
            "List Oracles": {args: [], func: [registry, 'getAllProviders']},
            "Get Oracle Info": {args: [{web3},"address"], func: [Util, 'getProviderInfo']},
            "Get Query Status": {args: [{web3},"queryId"], func: [dispatch, 'getStatus']},
            "Calculate Required Zap": {args: ["provider", "endpoint", "dots"], func: [bondage, 'calcZapForDots']},
            "General": {args: generalChoices, func: 'getChoice', choice: true},
            "I'm Provider": {args: this.providerChoices, func: 'getChoice', choice: true},
            "I'm Subscriber": {args: this.subscriberChoices, func: 'getChoice', choice: true},
            "Create Template": {args: templateChoices, func: 'getChoice', choice: true},
            "Exit": {args: process.exit, func: undefined}
        }
    }

    async main() {
        //Load the mnemonic and web3 instance
        const mnemonic = "pact inside track layer hello carry used silver pyramid bronze drama time"//await ask('Whats your mnemonic (empty entry will use blank mnemonic): ');
        const web3: any = new Web3(new HDWalletProviderMem(mnemonic, "wss://kovan.infura.io/_ws"));
        // Get the provider and zap packages
        let options = {networkId: (await web3.eth.net.getId()).toString(),networkProvider: web3.currentProvider}
        let registry = new ZapRegistry(options)
        let dispatch = new ZapDispatch(options)
        let bondage = new ZapBondage(options)
        this.provider = await loadProvider(web3, await loadAccount(web3));
        this.subscriber = await loadSubscriber(web3, await loadAccount(web3));
        this.providerCli = new ProviderCli(web3,this.provider)
        this.subscriberCli = new SubscriberCli(web3,this.subscriber,bondage)
        this.providerChoices = Object.keys(this.providerCli.list)
        this.subscriberChoices = Object.keys(this.subscriberCli.list)
        this.getFuncList(this.provider, this.subscriber, registry, dispatch, bondage, web3)
        this.list = Object.assign(this.list,this.providerCli.list,this.subscriberCli.list)
        console.log(await Util.viewInfo({web3}))
        await this.getMenu(mainChoices)
    }

    async getMenu(choices: string[]) {
        let res = await this.getChoice(choices)
        await this.execute(res);
    }

    async execute(choice: string): Promise<void> {
        if(!this.list) throw "No Menu found"
        // if (!Object.keys(this.funcList).includes(choice)) {
        //     console.log("invalid choice")
        //     process.exit(1)
        // }
        let func = this.list[choice].func
        let args = this.list[choice].args
        let ch = this.list[choice].choice
        if (!func) {
            console.log("Good bye")
            process.exit(0)
        }
        if (!!ch) {
            //this mean we are heading to another sub menu
            let res = await this.getChoice(args)
            return this.execute(res)
        }
        else {
            //Getting arguments
            let res
            if(this.providerChoices.includes(choice)){
                if(!this.providerCli) throw "Starting provider cli failed"
                else {
                    try {
                        res = await this.providerCli.execute(choice)
                    }catch(e){
                        console.error(e)
                        await this.getMenu(mainChoices)
                    }
                }
            }
            else if(this.subscriberChoices.includes(choice)){
                if(!this.subscriberCli) throw "Starting Subscriber Cli failed"
                try{
                    res = await this.subscriberCli.execute(choice)
                }catch(e){
                    console.error(e)
                    await this.getMenu(mainChoices)
                }
            }
            else {
                if (args.length > 0) {
                    //prompt for more info
                    let ans: any = await this.getInput(args)
                    for (let i in ans) {
                        if (!Object.keys(ans[i]).length)
                            delete ans[i]
                    }
                    let answers = ans
                    // if (ans.length > 0) {
                    //     answers = ans[0]
                    // }
                    res = await func[0][func[1]](...answers)
                } else {
                    try {
                        res = await
                            func[0][func[1]]()
                    } catch (e) {
                        console.error(e)
                    }
                }
            }
            try {
                res = JSON.stringify(res)
            } catch (e) {}
            console.log(res ? "Result : " + res : '')
            return this.getMenu(mainChoices)

        }
        process.exit(0)
    }



}
let cli = new Main()
cli.main()
    .then(console.log)
    .catch(console.error)
