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

export class TemplateCli extends CLI {
    constructor(web3:any) {
        super()
        this.web3 = web3
        this.list = {
            "Create Onchain Subscriber Bootstrap": {args: ["publicKey", "name"], func: createProvider},
            "Create Offchain Subcriber Bootstrap": {args: ["publicKey", "name"], func: createProvider},
            "Create  Oracle Template": {args: ['web3'], func: [Util, 'viewInfo']},
        }
    }

    async bootstrapOracleTemplate(){

    }

    async bootstrapOnchainSubscriber(){

    }





}
