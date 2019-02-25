#!/usr/bin/env node

import {Cli} from "./main"
try{
    Cli.start()
    .then(console.log)
    .catch(console.error)
}catch(e){
    console.log(e)
}
