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
	- From import
	```
		const zapCli = require("zap-term")
		zapCli.start({network:42,url:""})
	```
	- `network` : optional, default = 1, available on mainnet (1) and kovan (42)
	- `url` : optional, default = infura

## Note:
- Empty mnemonic entered is not recommended, the blank mnemonic will be used in this case.
