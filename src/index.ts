import { ZapArbiter } from "@zapjs/arbiter";
import { Curve } from "@zapjs/curve";
import { ZapBondage } from "@zapjs/bondage";
import { ZapDispatch } from "@zapjs/dispatch";
import { ZapRegistry } from "@zapjs/registry";
import { ZapProvider } from "@zapjs/provider";
import { ZapToken } from "@zapjs/zaptoken";

import {join, basename} from "path";
import {readdirSync} from "fs";
import * as readline from "readline";

const HDWalletProvider = require("truffle-hdwallet-provider-privkey");
const HDWalletProviderMem = require("truffle-hdwallet-provider");
const Web3 = require('web3');

/**
 * Ask a question and receive the result in stdin
 *
 * @param question - The question to ask
 * @return A promise resolved with the answer
 */
function ask(question: string): Promise<string> {
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout
	});

	return new Promise((resolve, reject) => {
		rl.question(question, (answer: string) => {
			rl.close();
			resolve(answer);
		});
	});
}

/**
 * Promise that is resolved after a certain timeout
 *
 * @param timeout - Amount of ms to wait
 */
function sleep(timeout: number): Promise<void> {
	return new Promise((resolve, reject) => {
		setTimeout(resolve, timeout);
	})
}

/**
 * Loads the contracts from a specially formatted file
 *
 * @param web3 - Web3 instance to be used
 * @param file - The file containing the artifacts directory and addresses
 * @returns The loaded objects in a JSON formatted instance
 */
async function loadContracts(web3: any): Promise<any> {
	const options: any = {
		artifactsDir: join(__dirname, '../', 'node_modules/@zapjs/artifacts/contracts/'),
		networkId: await web3.eth.net.getId(),
		networkProvider: web3.currentProvider,
	};

	return {
		'zapArbiter': new ZapArbiter(options),
		'zapBondage': new ZapBondage(options),
		'zapDispatch': new ZapDispatch(options),
		'zapRegistry': new ZapRegistry(options),
		'zapToken': new ZapToken(options)
	};
}

/**
 * Loads the first account from the current loaded provider in a web3 instance
 * 
 * @param web3 - Web3 instance to load accounts from
 * @returns The first account found
 */
async function loadAccount(web3: any): Promise<string> {
	const accounts: string[] = await web3.eth.getAccounts();

	if ( accounts.length == 0 ) {
		console.error('Unable to find an account in the current web3 provider');
		process.exit(1);

		return "";
	}

	return accounts[0];
}

/**
 * Loads a ZapProvider from a given Web3 instance
 *
 * @param web3 - Web3 instance to load from
 * @returns ZapProvider instantiated
 */
async function loadProvider(web3: any): Promise<{ contracts: any, provider: ZapProvider }> {
	const owner: string = await loadAccount(web3);

	console.log("Found address:", owner);
	console.log("It has", await web3.eth.getBalance(owner)/1e18, "ETH");

	const contracts = await loadContracts(web3);

	const handler = {
		handleIncoming: (data: string) => {
			console.log('handleIncoming', data);
		},
		handleUnsubscription: (data: string) => {
			console.log('handleUnsubscription', data);
		},
		handleSubscription: (data: string) => {
			console.log('handleSubscription', data);
		},
	};

	return {
		provider: new ZapProvider(Object.assign(contracts, { owner, handler })),
		contracts: contracts
	};
}

/**
 * Create a provider for a ZapProvider instance based on user input
 *
 * @param provider - Provider to use
 */
async function createProvider(provider: ZapProvider): Promise<void> {
	console.log('Create a provider');
	const title = await ask('Title> ');
	const public_key = await ask('Public Key> ');
	const endpoint = await ask('Endpoint> ');
	const endpoint_params: string[] = [];

	console.log('Give the params for the endpoint. Give an empty one to continue.');
	while ( true ) {
		const endpoint_param: string = await ask('Endpoint Param> ');

		if ( endpoint_param.length == 0 ) {
			break;
		}

		endpoint_params.push(endpoint_param);
	}

	console.log('Creating provider...');
	await provider.initiateProvider({ public_key, title, endpoint, endpoint_params });
}

/**
 * Create a piecewise function for a provider
 * Uses math.js to parse an equation and then processes that into the params
 * @returns The encoded params
 */
async function createCurve(): Promise<Curve> {
	const constants: number[] = [];
	const parts: number[] = [];
	const dividers: number[] = [];

	while ( true ) {
		const _start: string = await ask('Start> ');

		if ( _start == '' ) {
			break;
		}

		const start: number = parseInt(_start);
		const end: number = parseInt(await ask('End> '));

		if ( isNaN(start) || isNaN(end) ) {
			console.error('Start and end must be numbers');
			continue;
		}

		const curve: string = await ask('Curve> ');
		const terms: string[] = curve.split('+').map(term => term.trim());
		let error: boolean = false;

		for ( const term of terms ) {
			let coef: number = 1;
			let exp: number = 0;
			let fn: number = 0;

			const tokens: string[] = [];
			const tokenRegex = /\s*([A-Za-z]+|[0-9]+|\S)\s*/g;

			let m;
			while ((m = tokenRegex.exec(term)) !== null) {
				tokens.push(m[1]);
			}

			for ( let i = 0; i < tokens.length; i++ ) {
				const token = tokens[i];

				if ( !isNaN(+token) ) {
					coef *= +token;

					if ( i < tokens.length - 1 && tokens[i + 1] == 'zap' ) {
						coef *= 1e18;
						i++;
					}
				}
				else if ( token == 'x' ) {
					exp = 1;
				}
				else if ( token == '*' ) {
					continue;
				}
				else if ( token == '^' ) {
					if ( i == tokens.length - 1 ) {
						console.error('Must specify an exponent.');
						error = true;						

						break;
					}

					const exponent: string = tokens[++i];

					if ( isNaN(+exponent) ) {
						console.error('Exponent must be a number');
						error = true;

						break;
					}

					exp = +exponent;
				}
			}

			if ( error ) {
				break;
			}

			constants.push(coef, exp, fn);
		}

		if ( error ) {
			continue;
		}

		parts.push(start);
		parts.push(end);
		dividers.push(constants.length / 3);
	}

	return new Curve(constants, parts, dividers);
}

/**
 * Create a provider curve for a ZapProvider instance based on user input
 *
 * @param provider - Provider to use
 */
async function createProviderCurve(provider: ZapProvider): Promise<void> {
	try {
		const endpoint: string = await ask('Endpoint> ');
		const curve: Curve = await createCurve();

		await provider.initiateProviderCurve({ endpoint, constants: curve.constants, parts: curve.parts, dividers: curve.dividers });

		console.log('Created endpoint', endpoint);
	}
	catch(err) {
		console.log('Failed to parse your input');
	}
}

/** 
 * Get the information for an endpoint
 *
 * @param provier - Provider to use
 */
async function getEndpointInfo(provider: ZapProvider): Promise<void> {
	const oracle: string = await ask('Oracle (Address)> ');
	const endpoint: string = await ask('Endpoint> ');

	const bound: number = await provider.zapBondage.getBoundDots({ subscriber: provider.providerOwner, provider: oracle, endpoint});
	const zapBound : number = await provider.getZapBound(endpoint);
	const curve = await provider.getCurve(endpoint);

	if ( curve.constants.length == 0 ) {
		console.log('Unable to find the endpoint.');
		return;
	}

	console.log('Curve:', curve);
	console.log('DOTs Bound:', bound);
	console.log('ZAP Bound:', zapBound);
}

/**
 * Conduct a bondage for a given provider
 *
 * @param provider - Provider to use
 */
async function doBondage(provider: ZapProvider, token: ZapToken, bondage: ZapBondage) {
	const bal = await token.balanceOf(provider.providerOwner);
	console.log('You have', bal, 'ZAP');

	const oracle: string = await ask('Oracle (Address)> ');
	const endpoint: string = await ask('Endpoint> ');

	let bound: number = await provider.zapBondage.getBoundDots({ subscriber: provider.providerOwner, provider: oracle, endpoint});

	console.log('You have', bound, 'DOTs bound. How many would you like to bond?');

	const dots: number = parseInt(await ask('DOTS> '));
	const amount = (await provider.zapBondage.calcZapForDots({ endpoint, dots, provider: oracle }));

	console.log('This will require', amount, 'ZAP. Bonding', dots, ' DOTs...');

	if ( amount > bal ) {
		console.log('Balance insufficent.');
		return;
	}

	const txid: string | any = await token.approve({ to: bondage.contract.options['address'], amount, from: provider.providerOwner });

	console.log('Approved the bondage contract for', amount, 'ZAP');
	console.log('Transaction Info:', typeof txid == 'string' ? txid : txid.transactionHash);

	console.log('Waiting 15 seconds to send bond request.');

	await sleep(15 * 1000);

	console.log('Doing the bond...');

	const bond_txid: string | any = await provider.zapBondage.bond({ provider: oracle, endpoint, zapNum: amount, from: provider.providerOwner });

	console.log('Bonded to endpoint.');
	console.log('Transaction Info:', typeof bond_txid == 'string' ? bond_txid : bond_txid.transactionHash);

	bound = await provider.zapBondage.getBoundDots({ subscriber: provider.providerOwner, provider: oracle, endpoint});
	console.log('You now have', bound, 'DOTs bonded.');
}

/**
 * Conduct an unbondage for a given provider
 *
 * @param provider - Provider to use
 */
async function doUnbondage(provider: ZapProvider, token: ZapToken, bondage: ZapBondage) {
	const oracle: string = await ask('Oracle (Address)> ');
	const endpoint: string = await ask('Endpoint> ');
	let bound: number = await provider.zapBondage.getBoundDots({ subscriber: provider.providerOwner, provider: oracle, endpoint});

	console.log('You have', bound, 'DOTs bonded. How many would you like to unbond?');

	const amount: number = parseInt(await ask('Amount> '));

	console.log('Unbonding', amount, 'DOTs...');

	const txid: string | any = await provider.zapBondage.unbond({ provider: oracle, endpoint, from: provider.providerOwner, dots: amount });
	
	console.log('Transaction Info:', typeof txid == 'string' ? txid : txid.transactionHash);

	bound = await provider.zapBondage.getBoundDots({ subscriber: provider.providerOwner, provider: oracle, endpoint});

	console.log('You have', bound, 'DOTs bonded.');
	const bal = await token.balanceOf(provider.providerOwner);
	console.log('You have', bal, 'ZAP');
}

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
	const web3: any = new Web3(new HDWalletProviderMem(mnemonic, "https://kovan.infura.io"));	 

	// Get the provider and contracts
	const { provider, contracts } = await loadProvider(web3);
	const bondage: ZapBondage = contracts.zapBondage;
	const token: ZapToken = contracts.zapToken;

	// If title hasn't been set bring them to the createProvider page
	const title = await provider.getTitle();

	if ( title.length == 0 ) {
		console.warn('Failed to find your provider title, please initiate your provider.');
		await createProvider(provider);
	}

	console.log('Found provider:', title);

	while ( true ) {
		console.log('What would you like to do? Type nothing to exit.');
		console.log('1) Instantiate Bonding Curve');
		console.log('2) Get Endpoint');
		console.log('3) Bond Zap');
		console.log('4) Unbond Zap');

		const option: string = await ask('Option> ');

		if ( option == '' ) {
			console.log('Good bye.');
			process.exit(0);
		}
		else if ( option == '1' ) {
			await createProviderCurve(provider);
		}
		else if ( option == '2' ) {
			await getEndpointInfo(provider);
		}
		else if ( option == '3' ) {
			await doBondage(provider, token, bondage);
		}
		else if ( option == '4' ) {
			await doUnbondage(provider, token, bondage);
		}
		else {
			console.error('Unknown option', option);
		}

		console.log('');
	}
}


main().then(() => {}).catch(console.error);