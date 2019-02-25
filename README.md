# zap-term

A Cli tool to interact with the Zap api.

## Installing

	$ yarn add zap-term

## Running
	- From Source:
	```
		- Modify src/index.ts as needed
		yarn start
	```
	- Commonjs
	```
		const zapTerm = require("zap-term")
		zapTerm.Cli.start()

	```
	- import
	```
		import {Cli} from 'zap-term'
		Cli.start()
	```
	- Executable
	```
		local install ./node_modules/.bin/zap-term
		global install zap-term
	```
	- `network` : optional, default = 1, available on mainnet (1) and kovan (42)
	- `url` : optional, default = infura url

## Note:
- Empty mnemonic entered is not recommended, the blank mnemonic will be used in this case.
