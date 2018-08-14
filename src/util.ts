import { ZapArbiter } from "@zapjs/arbiter";
import { ZapBondage } from "@zapjs/bondage";
import { ZapDispatch } from "@zapjs/dispatch";
import { ZapRegistry } from "@zapjs/registry";
import { ZapToken } from "@zapjs/zaptoken";

import { ZapProvider } from "@zapjs/provider";
import { ZapSubscriber } from "@zapjs/subscriber";

import { join } from "path";
import * as readline from "readline";

/**
 * Ask a question and receive the result in stdin
 *
 * @param question - The question to ask
 * @return A promise resolved with the answer
 */
export function ask(question: string): Promise<string> {
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
export function sleep(timeout: number): Promise<void> {
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
export async function loadContracts(web3: any): Promise<any> {
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
export async function loadAccount(web3: any): Promise<string> {
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
export async function loadProvider(web3: any, owner: string): Promise<ZapProvider> {
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

	return new ZapProvider(owner, Object.assign(contracts, { handler }));
}

/**
 * Loads a ZapProvider from a given Web3 instance
 *
 * @param web3 - Web3 instance to load from
 * @returns ZapProvider instantiated
 */
export async function loadSubscriber(web3: any, owner: string): Promise<ZapSubscribe> {
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

	return new ZapSubscriber(owner, Object.assign(contracts, { handler }));
}
