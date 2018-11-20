
const p  = require("inquirer");

export class CLI{
    list : {[key:string]:any}
    constructor(){
        this.list = {}
    }
    async execute(choice:string){
        let funcs = this.list[choice].func
        let args =this.list[choice].args
        try {
            return await funcs[0][funcs[1]](...args)
        }catch(e){
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
    async getInput(questions: string[] | any[]) {
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
}