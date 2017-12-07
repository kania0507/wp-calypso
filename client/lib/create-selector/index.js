/** @format */

/**
 * External dependencies
 */
import { castArray, isObject, forEach, fill } from 'lodash';

/**
 * A map that is Weak with objects but Strong with primitives
 */
export class LazyWeakMap {
	weakMap = new WeakMap();
	map = new Map();

	mapForKey = key => ( isObject( key ) ? this.weakMap : this.map );

	clear() {
		this.weakMap = new WeakMap();
		this.map.clear();
		return this;
	}

	set( k, v ) {
		this.mapForKey( k ).set( k, v );
		return this;
	}

	delete( k ) {
		this.mapForKey( k ).delete( k );
		return this;
	}

	get( k ) {
		return this.mapForKey( k ).get( k );
	}

	has( k ) {
		return this.mapForKey( k ).has( k );
	}
}

/**
 * Constants
 */

/**
 * Defines acceptable argument types for a memoized selector when using the
 * default cache key generating function.
 *
 * @type {Array}
 */
const VALID_ARG_TYPES = [ 'number', 'boolean', 'string' ];

/**
 * Default behavior for determining whether current state differs from previous
 * state, which is the basis upon which memoize cache is cleared. Should return
 * a value or array of values to be shallowly compared for strict equality.
 *
 * @type   {Function}
 * @param  {Object}    state Current state object
 * @return {(Array|*)}       Value(s) to be shallow compared
 */
const DEFAULT_GET_DEPENDANTS = state => state;

/**
 * At runtime, assigns a function which returns a cache key for the memoized
 * selector function, given a state object and a variable set of arguments. In
 * development mode, this warns when the memoized selector is passed a complex
 * object argument, as these cannot be depended upon as reliable cache keys.
 *
 * @type {Function} Function returning cache key for memoized selector
 */
const DEFAULT_GET_CACHE_KEY = ( () => {
	let warn, includes;
	if ( 'production' !== process.env.NODE_ENV ) {
		// Webpack can optimize bundles if it can detect that a block will
		// never be reached. Since `NODE_ENV` is defined using DefinePlugin,
		// these debugging modules will be excluded from the production build.
		warn = require( 'lib/warn' );
		includes = require( 'lodash/includes' );
	} else {
		return ( state, ...args ) => args.join();
	}

	return ( state, ...args ) => {
		const hasInvalidArg = args.some( arg => {
			return arg && ! includes( VALID_ARG_TYPES, typeof arg );
		} );

		if ( hasInvalidArg ) {
			warn( 'Do not pass complex objects as arguments for a memoized selector' );
		}

		return args.join();
	};
} )();

/**
 * Given an array of getDependants functions, returns a single function which,
 * when called, returns an array of mapped results from those functions.
 *
 * @param  {Function[]} dependants Array of getDependants
 * @return {Function}              Function mapping getDependants results
 */
const makeSelectorFromArray = dependants => ( state, ...args ) =>
	dependants.map( dependant => dependant( state, ...args ) );

/**
 * Returns a memoized state selector for use with the global application state.
 *
 * @param  {Function}            selector      Function calculating cached result
 * @param  {Function|Function[]} getDependants Function(s) describing dependent
 *                                             state, or an array of dependent
 *                                             state selectors
 * @param  {Function}            getCacheKey   Function generating cache key
 * @return {Function}                          Memoized selector
 */
export default function createSelector(
	selector,
	getDependants = DEFAULT_GET_DEPENDANTS,
	getCacheKey = DEFAULT_GET_CACHE_KEY
) {
	const memo = new LazyWeakMap();
	/* first pass with deps [ a, b ]:
		{
			[ a ]: new LazyWeakMap(),
			[ b ]: new LazyWeakMap( {
				[ cacheKey ]: selector( ... with [ a, b ] )
			} ),
		}
		*/
	/* second pass with deps [ b, c ]:
		{
			[ a ]: new LazyWeakMap(),
			[ b ]: new LazyWeakMap( {
				[ cacheKey ]: selector( ... with [ a, b ] ) // ( from first run )
			} ),
			[ c ]: new LazyWeakMap( {
				[ cacheKey ]: selector( ... with [ b, c ] )
			} ),
		}
		*/
	/* second pass with deps [ a, c ]:
		{
			[ a ]: new LazyWeakMap(),
			[ b ]: new LazyWeakMap( {
				[ cacheKey ]: selector( ... with [ a, b ] ) // ( from first run )
			} ),
			[ c ]: new LazyWeakMap( {
				[ cacheKey ]: selector( ... with [ b, c ] ) // ( from second run )
			} ),
		}
		*/

	if ( Array.isArray( getDependants ) ) {
		getDependants = makeSelectorFromArray( getDependants );
	}

	const memoizedSelector = function( state, ...args ) {
		const cacheKey = getCacheKey( state, ...args );
		const currentDependants = castArray( getDependants( state, ...args ) );

		// create a map of maps based on dependents in order to cache selector results.
		// ideally each map is a WeakMap but we fallback to a regular Map if a key woul be a non-object
		// the reason this charade is beneficial over standard memoization techniques is that now we can
		// garbage collect any values that are based on outdated dependents so the memory usage
		// should never balloon
		let currMemo;
		// First pass: Call someSelector with [ a, b ];
		// 		In the forEach below, [ a, b ] will eventually assign b as currMemo (after assigning a first)
		// Second pass: We'll later call someSelector with [ b, c ] as deps.
		// Third pass: What if we then have a use case where we call with [ a, c ]?
		forEach( currentDependants, dependent => {
			// Third pass: memo.has( dependent ) is true, pass the flow without creating a new LWM
			if ( ! memo.has( dependent ) ) {
				memo.set( dependent, new LazyWeakMap() );
			}
			// Third pass: set currMemo to the same value for [ c ] as in second pass.
			currMemo = memo.get( dependent );
		} );
		// Second pass: currMemo.has( cacheKey ) is false so set( cacheKey, selector... );
		// Third pass: currMemo.has( cacheKey ) is true so skip, returning cached selector from second pass
		//		Trouble is, the [ ...currentDependants ] are still [ b, c ], not [ a, c ]
		if ( ! currMemo.has( cacheKey ) ) {
			// call the selector with all of the dependents as args so it can use the fruits of
			// the cpu cycles used during dependent calculation
			const emptySelectorArgs = fill(
				new Array( Math.max( arity( selector ) - args.length, 0 ) ),
				undefined
			);
			currMemo.set(
				cacheKey,
				selector( state, ...[ ...args, ...emptySelectorArgs, ...currentDependants ] )
			);
		}

		return currMemo.get( cacheKey );
	};

	memoizedSelector.cache = memo;
	return memoizedSelector;
}

export function arity( fn ) {
	const arityRegex = /arguments\[(\d+)\]/g;

	const namedParametersCount = fn.length;
	const fnString = fn.toString();
	let maxParamAccessed = 0;

	let match = arityRegex.exec( fnString );
	while ( match ) {
		if ( match ) {
			maxParamAccessed = Math.max( maxParamAccessed, match[ 1 ] + 1 );
		}
		match = arityRegex.exec( fnString );
	}
	return Math.max( namedParametersCount, maxParamAccessed );
}
