import { ask } from "./util";
import { Curve } from "@zapjs/curve";

/**
 * Create a piecewise function for a provider
 * Uses math.js to parse an equation and then processes that into the params
 * @returns The encoded params
 */
export async function createCurve(): Promise<Curve> {
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