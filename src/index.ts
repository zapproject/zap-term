#!/usr/bin/env node
import { ask, loadProvider, loadSubscriber, loadAccount } from "./util";
import { createProvider, createProviderCurve, getEndpointInfo, doQuery, doResponses } from "./provider";
import { doBondage, doUnbondage, listOracles, viewInfo } from "./subscriber";

const HDWalletProvider = require("truffle-hdwallet-provider-privkey");
const HDWalletProviderMem = require("truffle-hdwallet-provider");
const Web3 = require('web3');

/**
 * Main function which operates the CLI
 */
async function main() {
	if ( process.argv.length != 2 ) {
		console.log('Usage:', process.argv[1]);
		process.exit(1);

		return;
	}

	// Load the mnemonic and web3 instance
	const mnemonic = await ask('Whats your mnemonic: ');
	const web3: any = new Web3(new HDWalletProviderMem(mnemonic, "wss://kovan.infura.io/_ws"));	 

	console.log('Using address', await loadAccount(web3));

	// Get the provider and contracts
	const provider = await loadProvider(web3, await loadAccount(web3));
	const subscriber = await loadSubscriber(web3, await loadAccount(web3));

	// If title hasn't been set bring them to the createProvider page
	let title = await provider.getTitle();

	if ( title.length == 0 ) {
		console.log('Found provider:', title);
	}
	else {
		console.log('This account is currently not setup as a provider');
	}

	while ( true ) {
		console.log('What would you like to do? Type nothing to exit.');

		console.log('0) My Info');
		if ( title == '' ) {
			console.log('1) Create provider');
		}
		else {
			console.log('1) Instantiate Bonding Curve');
		}
		console.log('2) Get Endpoint');
		console.log('3) Bond Zap');
		console.log('4) Unbond Zap');
		console.log('5) Query');

		if ( title.length > 0 ) {
			console.log('6) Respond to Queries');
		}
		else {
			console.log('6) Respond to Queries (unavailable)')
		}

		console.log('7) List Oracles')

		const option: string = (await ask('Option> ')).trim();

		if ( option == '' ) {
			console.log('Good bye.');
			process.exit(0);
		}
		else if ( option == '0' ) {
			await viewInfo(web3);
		}
		else if ( option == '1' ) {
			if ( title == '' ) {
				await createProvider(web3);
				title = await provider.getTitle();
			}
			else {
				await createProviderCurve(web3);
			}
		}
		else if ( option == '2' ) {
			await getEndpointInfo(web3);
		}
		else if ( option == '3' ) {
			await doBondage(web3);
		}
		else if ( option == '4' ) {
			await doUnbondage(web3);
		}
		else if ( option == '5' ) {
			await doQuery(web3);
		}
		else if ( option == '6' ) {
			if ( title.length > 0 ) {
				await doResponses(web3);
			}
			else {
				console.log('Unable to respond without setting up your provider first.');
			}
		}
		else if ( option == '7' ) {
			await listOracles(web3);
		}
		else {
			console.error('Unknown option', option);
		}

		console.log('');
	}
}


main().then(() => {}).catch(console.error);