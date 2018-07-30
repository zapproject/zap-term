import { ZapBondage } from "@zapjs/bondage";
import { Curve } from "@zapjs/curve";
import { ZapProvider } from "@zapjs/provider";
import { ZapToken } from "@zapjs/zaptoken";

import { sleep, loadContracts, loadAccount, ask } from "./util";
import { createCurve, curveString } from "./curve";

/**
 * Loads a ZapProvider from a given Web3 instance
 *
 * @param web3 - Web3 instance to load from
 * @returns ZapProvider instantiated
 */
export async function loadProvider(web3: any): Promise<{ contracts: any, provider: ZapProvider }> {
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
export async function createProvider(provider: ZapProvider): Promise<void> {
	console.log('Create a provider');
	const title = await ask('Title> ');

	if ( title.length == 0 ) {
		console.log('Not creating a provider now. Title cannot be empty.');
		return;
	}

	const public_key = await ask('Public Key (hex)> ');

	try {
		// This catches empty strings aswell.
		provider.zapArbiter.web3.utils.hexToString(public_key);
	}
	catch ( err ) {
		console.log('Not creating provider now. Public key must be a hex string.');
	}

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
 * Create a provider curve for a ZapProvider instance based on user input
 *
 * @param provider - Provider to use
 */
export async function createProviderCurve(provider: ZapProvider): Promise<void> {
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
export async function getEndpointInfo(provider: ZapProvider): Promise<void> {
	const oracle: string = await ask('Oracle (Address)> ');
	const endpoint: string = await ask('Endpoint> ');

	const bound: number = await provider.zapBondage.getBoundDots({ subscriber: provider.providerOwner, provider: oracle, endpoint});
	const zapBound : number = await provider.getZapBound(endpoint);
	const curve = await provider.getCurve(endpoint);

	if ( curve.constants.length == 0 ) {
		console.log('Unable to find the endpoint.');
		return;
	}

	console.log('Curve:', curveString(curve));
	console.log('DOTs Bound:', bound);
	console.log('ZAP Bound:', zapBound);
}

/**
 * Conduct a bondage for a given provider
 *
 * @param provider - Provider to use
 */
export async function doBondage(provider: ZapProvider, token: ZapToken, bondage: ZapBondage) {
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
export async function doUnbondage(provider: ZapProvider, token: ZapToken, bondage: ZapBondage) {
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