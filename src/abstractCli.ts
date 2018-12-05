import {loadProvider} from "./util";
let Web3 = require("web3")
const p  = require("inquirer");

export class CLI{
    list : {[key:string]:any}
    web3:any
    constructor(){
        this.list = {}
        this.web3 = new Web3()
    }
    async execute(choice:string){
        let funcs = this.list[choice].func
        let args =this.list[choice].args
        try {
            let answers = await this.getInputs(args)
            return await funcs[0][funcs[1]](...answers)
        }catch(e){
            console.error(e)
            return e
        }
    }
    async getChoice(options: string[]) {
        const promptList = {
            type: 'list',
            name: "res",
            message: " Choices ",
            choices: options
        }
        let response =  await p.prompt(promptList)
        return response['res']
    }
    async getInputs(questions: string[] | any[]) {
        let inqueries = []
        let answers = []
        for (let q of questions) {
            if ((typeof q) == 'string') {
                let inQ: any = {type: 'input'}
                inQ.name = q
                inQ.message = q
                inqueries.push(inQ)
            } else {
                answers.push(q)
            }
        }
        answers.push(await p.prompt(inqueries))
        return answers
    }
    async getInput(q:string){
        let inp = await p.prompt({
            type:'input',
            name:'res',
            message : q
        })
        return inp['res']
    }

    async getParamsInput(name : string, length?:number|undefined){
        let params = []
        let inp:string|any = ''
        do {
            if(length)
                if(--length==0) {
                    console.log("Maximum length is reached")
                    break
                }
            inp = await p.prompt({
                type:'input',
                name:'res',
                message : `${name} (empty to finish) : `
            })
            inp = inp['res']
            if(inp!=''){
                params.push(inp)
            }
        }while(inp!='')
        return params
    }
    async getProviderAndEndpoint(){
        let providerAddress = await this.getInput("Provider Address")
        let provider = await loadProvider(this.web3,providerAddress)
        let endpoints = await provider.getEndpoints()
        let e = await this.getChoice(endpoints)
        return [providerAddress,e,provider]
    }
}