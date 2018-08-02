import { ZapBondage } from "@zapjs/bondage";
import { Curve } from "@zapjs/curve";
import { Subscriber } from "@zapjs/subscriber";
import { ZapToken } from "@zapjs/zaptoken";
import { Utils } from "@zapjs/utils";

import { sleep, loadContracts, loadAccount, ask } from "./util";
import { createCurve, curveString } from "./curve";

/**
 * Loads a ZapProvider from a given Web3 instance
 *
 * @param web3 - Web3 instance to load from
 * @returns ZapProvider instantiated
 */
export async function loadSubscriber(web3: any): Promise<{ contracts: any, subscriber: Subscriber }> {
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
		subscriber: new Subscriber(Object.assign(contracts, { owner, handler })),
		contracts: contracts
	};
}

export async function doQuery(subscriber: Subscriber): Promise<void> {
	const provider: string = await ask('Provider Address> ');
	const endpoint: string = await ask('Endpoint> ');
	
	const bound: number = await subscriber.zapBondage.getBoundDots({ subscriber: subscriber.subscriberOwner, provider, endpoint});

	if ( bound == 0 ) {
		console.log('You do not have any bound dots to this provider');
		return;
	}

	console.log('You have', bound, 'DOTs bound to this provider\'s endpoint. 1 DOT will be used.');

	const endpointParams: string[] = [];

	console.log('Input your provider\'s endpoint paramaters. Enter a blank line to skip.')
	while ( true ) {
		const endpointParam: string = await ask('Endpoint Params> ');

		if ( endpointParam.length == 0 ) {
			break;
		}

		endpointParams.push(endpointParam);
	}

	const onchainProvider: boolean = (await ask('Is the provider on chain [y/N]> ')) == 'y';
	// Default this to false. We are off chain.
	const onchainSubscriber: boolean = false; // (await ask('Is the subscriber on chain [y/N]> ')) == 'y';

	const query: string = await ask('Query> ');

	console.log('Querying provider...');
	const txid: any = await subscriber.zapDispatch.queryData({ provider, query, endpoint, endpointParams, onchainProvider, onchainSubscriber, from: subscriber.subscriberOwner, gas: Utils.Constants.DEFAULT_GAS });
	const _id = txid.events['Incoming'].returnValues['id'];
	console.log('Queried provider. Transaction Hash:', typeof txid == 'string' ? txid : txid.transactionHash);

	const web3 = subscriber.zapArbiter.web3;
	const num = web3.utils.toBN(_id);
	const id = '0x' + num.toString(16);
	console.log('Query ID generate was', id);

	// Create a promise to get response
	const promise: Promise<any> = new Promise((resolve: any, reject: any) => {
		console.log('Waiting for response');
		let fulfilled = false;
		
		// Get the off chain response
		subscriber.zapDispatch.contract.events.OffchainResult1({ id }, (err: any, data: any) => {
			// Only call once
			if ( fulfilled ) return;
			fulfilled = true;

			// Output response
			if ( err ) reject(err);
			else       resolve(data.returnValues.response1);
		});
	});
	
	const res = await promise;
	console.log('Response', res);
}