/** @format */

/**
 * External dependencies
 */

import { filter, get } from 'lodash';

/**
 * Internal dependencies
 */
import { getSelectedSiteId } from 'state/ui/selectors';

/**
 * @param {Object} state Whole Redux state tree
 * @param {String} searchTerm Search term to check
 * @param {Number} [siteId] Site ID to check. If not provided, the Site ID selected in the UI will be used
 * @return {boolean} Whether the search results for a given term have been successfully loaded from the server.
 */
export const isCustomerSearchLoaded = (
	state,
	searchTerm,
	siteId = getSelectedSiteId( state )
) => {
	const inFlight = get(
		state,
		`extensions.woocommerce.sites[${ siteId }].customers.isSearching[${ searchTerm }]`
	);
	// Strict check because it could also be undefined.
	return false === inFlight;
};

/**
 * @param {Object} state Whole Redux state tree
 * @param {String} searchTerm Search term to check
 * @param {Number} [siteId] Site ID to check. If not provided, the Site ID selected in the UI will be used
 * @return {boolean} Whether the search results for a given term are currently being retrieved from the server.
 */
export const isCustomerSearchLoading = (
	state,
	searchTerm,
	siteId = getSelectedSiteId( state )
) => {
	const inFlight = get(
		state,
		`extensions.woocommerce.sites[${ siteId }].customers.isSearching[${ searchTerm }]`
	);
	// Strict check because it could also be undefined.
	return true === inFlight;
};

/**
 * @param {Object} state Whole Redux state tree
 * @param {String} searchTerm Search term to check
 * @param {Number} [siteId] Site ID to check. If not provided, the Site ID selected in the UI will be used
 * @return {array} List of customer results matching term
 */
export const getCustomerSearchResults = (
	state,
	searchTerm,
	siteId = getSelectedSiteId( state )
) => {
	if ( ! isCustomerSearchLoaded( state, searchTerm, siteId ) ) {
		return [];
	}

	const customers = get( state, `extensions.woocommerce.sites[${ siteId }].customers.items`, {} );
	const customerIdsForTerm = get(
		state,
		`extensions.woocommerce.sites[${ siteId }].customers.queries[${ searchTerm }]`,
		[]
	);
	return filter( customerIdsForTerm.map( id => customers[ id ] || false ) );
};

/**
 * @param {Object} state Whole Redux state tree
 * @param {Number} customerId Customer ID to get
 * @param {Number} [siteId] Site ID to check. If not provided, the Site ID selected in the UI will be used
 * @return {Object|False} a customer object as stored in the API, false if not found
 */
export const getCustomer = ( state, customerId, siteId = getSelectedSiteId( state ) ) => {
	return get(
		state,
		`extensions.woocommerce.sites[${ siteId }].customers.items[${ customerId }]`,
		false
	);
};
