/** @format */

/**
 * External dependencies
 */
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { isEqual, sortBy } from 'lodash';
import { localize } from 'i18n-calypso';
import { pie as d3Pie, arc as d3Arc } from 'd3-shape';

/**
 * Internal dependencies
 */
import DataType from './data-type';

const SVG_SIZE = 300;
const NUM_COLOR_SECTIONS = 3;

class PieChart extends Component {
	static propTypes = {
		data: PropTypes.arrayOf( DataType ).isRequired,
		translate: PropTypes.func.isRequired,
		title: PropTypes.oneOfType( [ PropTypes.string, PropTypes.func ] ),
	};

	state = this.processData( this.props.data );

	componentWillReceiveProps( nextProps ) {
		if ( ! isEqual( this.props.data, nextProps.data ) ) {
			this.setState( this.processData( nextProps.data ) );
		}
	}

	sortDataAndAssignSections( data ) {
		return sortBy( data, datum => datum.value )
			.reverse()
			.map( ( datum, index ) => ( {
				...datum,
				sectionNum: index % NUM_COLOR_SECTIONS,
			} ) );
	}

	processData( data ) {
		const sortedData = this.sortDataAndAssignSections( data );

		const arcs = d3Pie()
			.startAngle( Math.PI )
			.startAngle( -Math.PI )
			.value( datum => datum.value )( sortedData );

		const arcGen = d3Arc()
			.innerRadius( 0 )
			.outerRadius( SVG_SIZE / 2 );

		const paths = arcs.map( arc => arcGen( arc ) );

		return {
			data: sortedData.map( ( datum, index ) => ( {
				...datum,
				path: paths[ index ],
			} ) ),
			dataTotal: sortedData.reduce( ( total, datum ) => total + datum.value, 0 ),
		};
	}

	renderPieChart() {
		const { data } = this.state;
		return data.map( datum => {
			return (
				<path
					className={ `pie-chart__chart-section-${ datum.sectionNum }` }
					key={ datum.name }
					d={ datum.path }
				/>
			);
		} );
	}

	renderEmptyChart() {
		return (
			<circle cx={ 0 } cy={ 0 } r={ SVG_SIZE / 2 } className="pie-chart__chart-drawing-empty" />
		);
	}

	render() {
		const { title, translate } = this.props;
		const { dataTotal } = this.state;

		return (
			<div className={ 'pie-chart' }>
				<svg
					className={ 'pie-chart__chart-drawing' }
					viewBox={ `0 0 ${ SVG_SIZE } ${ SVG_SIZE }` }
					preserveAspectRatio={ 'xMidYMid meet' }
				>
					<g transform={ `translate(${ SVG_SIZE / 2 }, ${ SVG_SIZE / 2 })` }>
						{ dataTotal > 0 ? this.renderPieChart() : this.renderEmptyChart() }
					</g>
				</svg>
				{ title && (
					<h2 className={ 'pie-chart__title' }>
						{ 'string' === typeof title ? title : title( translate, dataTotal ) }
					</h2>
				) }
			</div>
		);
	}
}

export default localize( PieChart );
