import { Curve } from "@zapjs/curve";
import { ZapSubscriber } from "@zapjs/subscriber";
import { ZapProvider } from "@zapjs/provider";
import { BNType } from "@zapjs/types";

import { sleep, loadAccount, ask, loadProvider, loadSubscriber } from "./util";
import { createCurve, curveString } from "./curve";

/**
 * Conduct a bondage for a given provider
 *
 * @param web3 - Loaded web3 to use
 */
export async function doBondage(web3: any) {
	// Load subscrier information
	const user: string = await loadAccount(web3);
	const subscriber: ZapSubscriber = await loadSubscriber(web3, user);
	const bal: BNType = web3.utils.toBN(await subscriber.getZapBalance());

	console.log('You have', bal.toString(), 'ZAP');

	// Load provider information
	const oracle: string = await ask('Oracle (Address)> ');

	if ( oracle.length == 0 ) {
		return;
	}

	const endpoint: string = await ask('Endpoint> ');
	const provider: ZapProvider = await loadProvider(web3, oracle);

	// Get DOT information
	const bound_before: BNType = web3.utils.toBN(await provider.getBoundDots({ subscriber: user, endpoint}));
	console.log(`You have ${bound_before} DOTs bound. How many would you like to bond?`);

	// Calculate pricing information
	const dots: number = parseInt(await ask('DOTS> '));
	const amount: BNType = web3.utils.toBN(await provider.getZapRequired({ endpoint, dots }));

	console.log(`This will require ${amount.toString()} wei ZAP. Bonding ${dots} DOTs...`);

	if ( !subscriber.hasEnoughZap(amount)  ) {
		console.log('Balance insufficent.');
		return;
	}

	console.log('Bonding to the oracle...');

	const bond_txid: string | any = await subscriber.bond({ provider: oracle, endpoint, dots });

	console.log('Bonded to endpoint.');
	console.log(`Transaction Info: ${typeof bond_txid == 'string' ? bond_txid : bond_txid.transactionHash}`);

	const bound_after = await provider.getBoundDots({ subscriber: user, endpoint});
	console.log(`You now have ${bound_after} DOTs bonded.`);
}

/**
 * Conduct an unbondage for a given provider
 *
 * @param web3 - Loaded web3 to use
 */
export async function doUnbondage(web3: any) {
	const user: string = await loadAccount(web3);
	const subscriber: ZapSubscriber = await loadSubscriber(web3, user);

	const oracle: string = await ask('Oracle (Address)> ');

	if ( oracle.length == 0 ) {
		return;
	}

	const endpoint: string = await ask('Endpoint> ');
	const provider: ZapProvider = await loadProvider(web3, oracle);

	const bound_before: BNType = web3.utils.toBN(await provider.getBoundDots({ subscriber: user, endpoint}));

	if ( bound_before.isZero() ) {
		console.log('You have no DOTs bound to this provider.');
		return;
	}

	console.log(`You have ${bound_before.toString()} DOTs bonded. How many would you like to unbond?`);

	const dots: number = parseInt(await ask('Amount> '));
	console.log(`Unbonding ${dots} DOTs...`);

	const txid: string | any = await subscriber.unBond({ provider: oracle, endpoint, dots });
	console.log(`Transaction Info: ${typeof txid == 'string' ? txid : txid.transactionHash}`);

	const bound_after = await provider.getBoundDots({ subscriber: user, endpoint});
	console.log(`You have ${bound_after.toString()} DOTs bonded.`);

	const bal = await subscriber.getZapBalance();
	console.log('You have', bal.toString(), 'ZAP');
}

/**
 * List all of the oracles currently available 
 */
export async function listOracles(web3: any) {
	const user: string = await loadAccount(web3);
	const subscriber: ZapSubscriber = await loadSubscriber(web3, user);

	const addresses: string[]|Object = await subscriber.zapRegistry.getAllProviders();
	if(Array.isArray(addresses)) {
        if (addresses.length == 0) {
            console.log(`Didn't find any providers`);
            return;
        }


        const providers: ZapProvider[] = await Promise.all(addresses.map(address => loadProvider(web3, address)));

        // // Display each one
        for (const provider of providers) {
            const endpoints = await provider.getEndpoints();

            for (const endpoint of endpoints) {
                console.log(`Provider ${await provider.getTitle()} / Endpoint ${endpoint}`);
                console.log(`Address: ${provider.providerOwner}`);
                console.log(`Curve\n${curveString((await provider.getCurve(endpoint)).values)}\n`);
            }
        }
    }
    else{
    	console.error("Fail to retrieve providers, unknown type")
		return;
	}
}

/**
 * View the info about a specific curve
 * @param web3 - Web3 instance to use
 */
export async function viewInfo(web3: any) {
	const account: string = await loadAccount(web3);
	const subscriber: ZapSubscriber = await loadSubscriber(web3, account);

	console.log(`Address: ${account}`);
	console.log(`ETH Balance: ${await web3.eth.getBalance(account)} wei`);	
	console.log(`ZAP Balance: ${await subscriber.getZapBalance()} wei ZAP`);
}