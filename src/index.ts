import { ask } from "./util";
import { loadProvider, createProvider, createProviderCurve, getEndpointInfo, doBondage, doUnbondage } from "./provider";
import { loadSubscriber, doQuery } from "./subscriber";

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

	// Get the provider and contracts
	const { provider, contracts } = await loadProvider(web3);
	const { subscriber,  } = await loadSubscriber(web3);

	// If title hasn't been set bring them to the createProvider page
	let title = await provider.getTitle();

	if ( true ) {
		console.warn('Failed to find your provider title, no provider instantiated');
		console.log('Do you want to create a provider now?')

		if ( (await ask('Create Provider [y/N]> ')) == 'y' ) {
			await createProvider(provider);
			title = await provider.getTitle();
		}
		else {
			console.log('Not creating a provider now.');
		}
	}

	console.log('Found provider:', title);

	while ( true ) {
		console.log('What would you like to do? Type nothing to exit.');

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

		const option: string = await ask('Option> ');

		if ( option == '' ) {
			console.log('Good bye.');
			process.exit(0);
		}
		else if ( option == '1' ) {
			if ( title == '' ) {
				await createProvider(provider);
				title = await provider.getTitle();
			}
			else {
				await createProviderCurve(provider);
			}
		}
		else if ( option == '2' ) {
			await getEndpointInfo(provider);
		}
		else if ( option == '3' ) {
			await doBondage(provider, contracts.zapToken, contracts.zapBondage);
		}
		else if ( option == '4' ) {
			await doUnbondage(provider, contracts.zapToken, contracts.zapBondage);
		}
		else if ( option == '5' ) {
			await doQuery(subscriber);
		}
		else {
			console.error('Unknown option', option);
		}

		console.log('');
	}
}


main().then(() => {}).catch(console.error);