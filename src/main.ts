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
import {GeneralCli} from "./generalCli";
import {TemplateCli} from "./templateCli";
const bip39 = require("bip39")

const HDWalletProviderMem = require("truffle-hdwallet-provider");
const Web3 = require('web3');

export class Main extends CLI{
    funcList: { [key: string]: any }|undefined
    clis : any
    choices : any
    mainMenu: string[]
    constructor() {
        super()
        this.clis = {}
        this.choices = {}
        this.mainMenu = []
    }


    getMainList(generalChoices:string[],providerChoices:string[],subscriberChoices:string[],templateChoices:string[]) {
        this.list = {
            "General": {args: generalChoices, func: 'getChoice', choice: true},
            "I'm Provider": {args: providerChoices, func: 'getChoice', choice: true},
            "I'm Subscriber": {args: subscriberChoices, func: 'getChoice', choice: true},
            // "Create Template": {args: templateChoices, func: 'getChoice', choice: true}
        }
        this.mainMenu = Object.keys(this.list)
        this.mainMenu.push(new p.Separator(),"Exit", new p.Separator())
    }

    async start() {
        //Load the mnemonic and web3 instance
        // const mnemonic = "pact inside track layer hello carry used silver pyramid bronze drama time"
        console.log("Choose Network : \n")
        const networkChoice = await this.getChoice(["MAIN","KOVAN"])
        const network = networkChoice == "MAIN"? 1 : 42
        let url = await ask("Enter network url , empty for infura default : ")
        let mnemonic = await ask('Whats your mnemonic (empty to create new mnemonic): ');
        if(!mnemonic || mnemonic==''){
            mnemonic = bip39.generateMnemonic()
        }
        let web3:any=undefined
        if(network==42){
            if(!url || url=='')
                url = "wss://kovan.infura.io/ws/v3/09323fc48925428bbae7cefd272dd0c1"
        }
        else{
            if(!url || url=='')
                url = "wss://mainnet.infura.io/ws/v3/63dbbe242127449b9aeb061c6640ab95"
        }
        web3 = new Web3(new HDWalletProviderMem(mnemonic, url));
        // Get the provider and zap packages
        let options = {networkId: (await web3.eth.net.getId()).toString(),networkProvider: web3.currentProvider}
        let registry = new ZapRegistry(options)
        let dispatch = new ZapDispatch(options)
        let bondage = new ZapBondage(options)
        let provider = await loadProvider(web3, await loadAccount(web3));
        let subscriber = await loadSubscriber(web3, await loadAccount(web3));
        let providerCli = new ProviderCli(web3,provider)
        let subscriberCli = new SubscriberCli(web3,subscriber,bondage)
        let providerChoices = Object.keys(providerCli.list)
        let subscriberChoices = Object.keys(subscriberCli.list)
        let generalCli = new GeneralCli(web3,registry,bondage,dispatch)
        let generalChoices = Object.keys(generalCli.list)
        let templateCli = new TemplateCli(web3)
        let templateChoices = Object.keys(templateCli)
        this.getMainList(generalChoices,providerChoices,subscriberChoices,templateChoices)
        this.list = Object.assign(this.list,providerCli.list,subscriberCli.list,generalCli.list)
        this.clis = {provider:providerCli,subscriber:subscriberCli,general:generalCli}
        this.choices = {provider:providerChoices,subscriber:subscriberChoices,general:generalChoices}
        // console.log("------------------------\n ZAP-CLI TOOL\n------------------------")
        console.log(" _____           \n" +
            "|__  /__ _ _ __  \n" +
            "  / // _` | '_ \\ \n" +
            " / /| (_| | |_) |\n" +
            "/____\\__,_| .__/ \n" +
            "          |_| ")
        console.log(await Util.viewInfo({web3}))
        return await this.getMenu(this.mainMenu)
    }

    async getMenu(choices: string[]) {
        let res = await this.getChoice(choices)
        await this.execute(res);
    }

    async execute(choice: string): Promise<void> {
        if (choice=="Exit") {
            console.log("Good bye")
            process.exit(0)
        }
        if(choice=="Main Menu"){
            return await this.getMenu(this.mainMenu)
        }
        if(!this.list) throw "No Menu found"
        let func = this.list[choice].func
        let args = this.list[choice].args
        let ch = this.list[choice].choice
        if (!!ch) {
            //this mean we are heading to another sub men
            args.push(new p.Separator(),"Main Menu","Exit", new p.Separator())
            let res = await this.getChoice(args)
            return this.execute(res)
        }
        else {
            //Getting arguments
            let res
            let subCli = false
            for(let i in this.choices) {
                subCli = true
                if (this.choices[i].includes(choice)) {
                    if (!this.clis[i]) throw "Starting sub cli failed"
                    else {
                        try {
                            res = await this.clis[i].execute(choice)
                        } catch (e) {
                            console.error(e)
                            return await this.getMenu(this.mainMenu)
                        }
                    }
                }
            }
            if(!subCli) {
                if (args.length > 0) {
                    //prompt for more info
                    let ans: any = await this.getInputs(args)
                    for (let i in ans) {
                        if (!Object.keys(ans[i]).length)
                            delete ans[i]
                    }
                    res = await func[0][func[1]](...ans)
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
            return this.getMenu(this.mainMenu)

        }
        process.exit(0)
    }



}
export const Cli= new Main()
