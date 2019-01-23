import { ask } from "./util";
import { Curve, CurveType } from "@zapjs/curve";

/**
 * Create a piecewise function for a provider
 * Uses math.js to parse an equation and then processes that into the params
 * @returns The encoded params
 */
export async function createCurve(): Promise<CurveType> {
	let start = 1;
	const _curve: number[] = [];

	while ( true ) {
		const _end: string = await ask(`Curve starting at ${start} to> `);

		if ( _end.length == 0 ) {
			break;
		}

		const end: number = parseInt(_end);

		if ( isNaN(end) ) {
			console.error('Start and end must be numbers');
			continue;
		}

		const curve: string = await ask('Curve ( example : 1+x+2x^2 )> ');
		const terms: string[] = curve.split('+').map(term => term.trim());

		const current_curve: number[] = [];
		let error: boolean = false;

		for ( const term of terms ) {
			let coef: number = 1;
			let exp: number = 0;

			const tokens: string[] = [];
			const tokenRegex = /\s*([A-Za-z]+|[0-9]+|\S)\s*/g;

			let m;
			while ( (m = tokenRegex.exec(term)) !== null ) {
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

			while ( current_curve.length < exp ) {
				current_curve.push(0);
			}

			current_curve[exp] = coef;
		}

		if ( error ) {
			continue;
		}

		_curve.push(current_curve.length, ...current_curve, end);
		start = end + 1;
	}

	return _curve;
}

/**
 * Create a string representing a piecewise function
 * @param curve The curve to be stringified
 * @returns The stringified curve
 */
export function curveString(curve: CurveType): string {
	if ( curve.length == 0 ) {
		return "Empty curve";
	}

	let output = "";

	let start = 1;
	let index = 0;

	while ( index < curve.length ) {
		// 3 0 0 0 2 1000
		const length = +curve[index];
		const base = index + 1;
		const poly = curve.slice(base, base + length);
		const end = +curve[base + length];

		output += poly.map((x, i) => {
			if ( x == 0 ) {
				return '';
			}

			switch ( i ) {
				case 0:  return `${x}`;
				case 1:  return `${x > 1 ? x : ''}x`;
				default: return `${x > 1 ? x : ''}x^${i}`;
			}
		}).filter(x => x.length > 0).join(" + ") + ` on (${start} to ${end}]\n`;

		index = base + length + 1;
		start = end;
	}

	return output;
}
