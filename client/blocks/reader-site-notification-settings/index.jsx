/** @format */
/**
 * External dependencies
 */
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { connect } from 'react-redux';
import { find, get } from 'lodash';

/**
 * Internal dependencies
 */
import { localize } from 'i18n-calypso';
import Gridicon from 'gridicons';
import ReaderPopover from 'components/reader-popover';
import SegmentedControl from 'components/segmented-control';
import ControlItem from 'components/segmented-control/item';
import FormToggle from 'components/forms/form-toggle';
import { getReaderFollows } from 'state/selectors';
import {
	subscribeToNewPostEmail,
	updateNewPostEmailSubscription,
	unsubscribeToNewPostEmail,
	subscribeToNewCommentEmail,
	unsubscribeToNewCommentEmail,
	subscribeToNewPostNotifications,
	unsubscribeToNewPostNotifications,
} from 'state/reader/follows/actions';
import { recordTracksEvent } from 'state/analytics/actions';

class ReaderSiteNotificationSettings extends Component {
	static displayName = 'ReaderSiteNotificationSettings';
	static propTypes = {
		siteId: PropTypes.number,
	};

	state = {
		showPopover: false,
		selected: this.props.emailDeliveryFrequency,
	};

	componentWillReceiveProps( nextProps ) {
		if ( nextProps.emailDeliveryFrequency !== this.props.emailDeliveryFrequency ) {
			this.setState( { selected: nextProps.emailDeliveryFrequency } );
		}
	}

	togglePopoverVisibility = () => {
		this.setState( { showPopover: ! this.state.showPopover } );
	};

	closePopover = () => {
		this.setState( { showPopover: false } );
	};

	saveIconRef = ref => ( this.iconRef = ref );
	saveSpanRef = ref => ( this.spanRef = ref );

	setSelected = text => () => {
		const { siteId } = this.props;
		this.setState( { selected: text } );
		this.props.updateNewPostEmailSubscription( siteId, text );

		const tracksProperties = { site_id: siteId, delivery_frequency: text };
		this.props.recordTracksEvent( 'calypso_reader_post_emails_set_frequency', tracksProperties );
	};

	toggleNewPostEmail = () => {
		const { siteId } = this.props;
		const tracksProperties = { site_id: siteId };

		if ( this.props.sendNewPostsByEmail ) {
			this.props.unsubscribeToNewPostEmail( siteId );
			this.props.recordTracksEvent( 'calypso_reader_post_emails_toggle_off', tracksProperties );
		} else {
			this.props.subscribeToNewPostEmail( siteId );
			this.props.recordTracksEvent( 'calypso_reader_post_emails_toggle_on', tracksProperties );
		}
	};

	toggleNewCommentEmail = () => {
		const { siteId } = this.props;
		const tracksProperties = { site_id: siteId };

		if ( this.props.sendNewCommentsByEmail ) {
			this.props.unsubscribeToNewCommentEmail( siteId );
			this.props.recordTracksEvent( 'calypso_reader_comment_emails_toggle_off', tracksProperties );
		} else {
			this.props.subscribeToNewCommentEmail( siteId );
			this.props.recordTracksEvent( 'calypso_reader_comment_emails_toggle_on', tracksProperties );
		}
	};

	toggleNewPostNotification = () => {
		const { siteId } = this.props;
		const tracksProperties = { site_id: siteId };

		if ( this.props.sendNewPostsByNotification ) {
			this.props.unsubscribeToNewPostNotifications( siteId );
			this.props.recordTracksEvent(
				'calypso_reader_post_notifications_toggle_off',
				tracksProperties
			);
		} else {
			this.props.subscribeToNewPostNotifications( siteId );
			this.props.recordTracksEvent(
				'calypso_reader_post_notifications_toggle_on',
				tracksProperties
			);
		}
	};

	render() {
		const {
			translate,
			sendNewCommentsByEmail,
			sendNewPostsByEmail,
			sendNewPostsByNotification,
		} = this.props;

		if ( ! this.props.siteId ) {
			return null;
		}

		return (
			<div className="reader-site-notification-settings">
				<span
					className="reader-site-notification-settings__button"
					onClick={ this.togglePopoverVisibility }
					ref={ this.saveSpanRef }
				>
					<Gridicon icon="cog" size={ 24 } ref={ this.saveIconRef } />
					<span
						className="reader-site-notification-settings__button-label"
						title={ translate( 'Email settings' ) }
					>
						{ translate( 'Settings' ) }
					</span>
				</span>

				<ReaderPopover
					onClose={ this.closePopover }
					isVisible={ this.state.showPopover }
					context={ this.iconRef }
					ignoreContext={ this.spanRef }
					position={ 'bottom left' }
					className="reader-site-notification-settings__popout"
				>
					<div className="reader-site-notification-settings__popout-toggle">
						{ translate( 'Notify me of new posts' ) }
						<Gridicon icon="bell" size={ 18 } />
						<FormToggle
							onChange={ this.toggleNewPostNotification }
							checked={ sendNewPostsByNotification }
							wrapperClassName="reader-site-notification-settings__popout-form-toggle"
						/>
						<p className="reader-site-notification-settings__popout-hint">
							{ translate( 'Receive web and mobile notifications for new posts from this site.' ) }
						</p>
					</div>

					<div className="reader-site-notification-settings__popout-toggle">
						{ translate( 'Email me new posts' ) }
						<FormToggle onChange={ this.toggleNewPostEmail } checked={ sendNewPostsByEmail } />
					</div>
					{ sendNewPostsByEmail && (
						<SegmentedControl>
							<ControlItem
								selected={ this.state.selected === 'instantly' }
								onClick={ this.setSelected( 'instantly' ) }
							>
								{ translate( 'Instantly' ) }
							</ControlItem>
							<ControlItem
								selected={ this.state.selected === 'daily' }
								onClick={ this.setSelected( 'daily' ) }
							>
								{ translate( 'Daily' ) }
							</ControlItem>
							<ControlItem
								selected={ this.state.selected === 'weekly' }
								onClick={ this.setSelected( 'weekly' ) }
							>
								{ translate( 'Weekly' ) }
							</ControlItem>
						</SegmentedControl>
					) }
					<div className="reader-site-notification-settings__popout-toggle">
						{ translate( 'Email me new comments' ) }
						<FormToggle
							onChange={ this.toggleNewCommentEmail }
							checked={ sendNewCommentsByEmail }
						/>
					</div>
				</ReaderPopover>
			</div>
		);
	}
}

const mapStateToProps = ( state, ownProps ) => {
	if ( ! ownProps.siteId ) {
		return {};
	}

	const follow = find( getReaderFollows( state ), { blog_ID: ownProps.siteId } );
	const deliveryMethodsEmail = get( follow, [ 'delivery_methods', 'email' ], {} );

	return {
		sendNewCommentsByEmail: deliveryMethodsEmail && !! deliveryMethodsEmail.send_comments,
		sendNewPostsByEmail: deliveryMethodsEmail && !! deliveryMethodsEmail.send_posts,
		emailDeliveryFrequency: deliveryMethodsEmail && deliveryMethodsEmail.post_delivery_frequency,
		sendNewPostsByNotification: get(
			follow,
			[ 'delivery_methods', 'notification', 'send_posts' ],
			false
		),
	};
};

export default connect( mapStateToProps, {
	subscribeToNewPostEmail,
	unsubscribeToNewPostEmail,
	updateNewPostEmailSubscription,
	subscribeToNewCommentEmail,
	unsubscribeToNewCommentEmail,
	subscribeToNewPostNotifications,
	unsubscribeToNewPostNotifications,
	recordTracksEvent,
} )( localize( ReaderSiteNotificationSettings ) );
