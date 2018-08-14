import { Curve } from "@zapjs/curve";
import { ZapSubscriber } from "@zapjs/subscriber";
import { ZapProvider } from "@zapjs/provider";

import { sleep, loadContracts, loadAccount, ask, loadProvider, loadSubscriber } from "./util";
import { createCurve, curveString } from "./curve";

/**
 * Conduct a bondage for a given provider
 *
 * @param web3 - Loaded web3 to use
 */
export async function doBondage(web3: any) {
	const user: string = await loadAccount(web3);
	const subscriber: ZapSubscriber = await loadSubscriber(web3, user);
	const bal: number = await subscriber.getZapBalance();

	console.log('You have', bal, 'ZAP');

	const oracle: string = await ask('Oracle (Address)> ');

	if ( oracle.length == 0 ) {
		return;
	}

	const endpoint: string = await ask('Endpoint> ');
	const provider: ZapProvider = await loadProvider(web3, oracle);

	const bound_before: number = await provider.getBoundDots({ subscriber: user, endpoint});
	console.log(`'You have ${bound_before} DOTs bound. How many would you like to bond?`);

	const dots: number = parseInt(await ask('DOTS> '));
	const amount = await provider.getZapRequired({ endpoint, dots });

	console.log(`'This will require ${amount / 1e18} ZAP. Bonding ${dots} DOTs...'`);

	if ( amount > (bal * 1e18) ) {
		console.log('Balance insufficent.');
		return;
	}

	console.log('Doing the bond...');

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

	const bound_before: number = await provider.getBoundDots({ subscriber: user, endpoint});

	if ( bound_before == 0 ) {
		console.log('You have no DOTs bound to this provider.');
		return;
	}

	console.log(`'You have ${bound_before} DOTs bonded. How many would you like to unbond?`);

	const dots: number = parseInt(await ask('Amount> '));
	console.log(`'Unbonding ${dots} DOTs...`);

	const txid: string | any = await subscriber.unBond({ provider: oracle, endpoint, dots });
	console.log(`Transaction Info: ${typeof txid == 'string' ? txid : txid.transactionHash}`);

	const bound_after = await provider.getBoundDots({ subscriber: user, endpoint});
	console.log(`'You have ${bound_after} DOTs bonded.`);

	const bal = await subscriber.getZapBalance();
	console.log('You have', bal, 'ZAP');
}