/*
 * MIT License
 *
 * Copyright (c) 2018 Joseph R. Morris
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NON-INFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
*/

/** @module app/game **/

/**
 * This module acts at the main point of entry for the application.
 * @author Joseph Morris <JRM.Softworks@gmail.com>
 * @version 1.0
 * @since 1.0
 */

define(['jquery', 'app/render_manager', 'app/player', 'event_types', 'app/messages', 'app/view_username'],
	function (jQ, render_manager, Player, Events, Messages, view_username) {

	require(['bootstrap'], function() {});

	const SERVER_PATH = window.location.origin;
	const DEFAULT_NOTICE_DURATION = 2500;
	const NOTICE_TYPES = {warning: 'warning', danger: 'danger', success: 'success'};

	const imageRoot = "/static/img/";

	const socket = Player.getConnection();

	function init(isTeacher, urlRoom) {

		jQ('html').css('height', window.innerHeight + "px");

		jQ(window).on('orientationchange', function () {
			jQ('html').css('height', window.innerHeight + "px");
        });

		jQ(window).on('resize', function () {
			jQ('html').css('height', window.innerHeight + "px");
		});

		preload([
			'logo.svg',
			'group_selection.svg',
			'room.svg',
			'room_settings.svg',
			'username.svg',
			'1_place.svg',
			'2_place.svg',
			'3_place.svg',
			'fail.svg',
			'good_try.svg',
			'no_data.svg'
		], function () {

            // Set up our template rendering system to receive templates from the server.
            socket.on(Events.RENDER_TEMPLATE, render_manager.renderResponse);

			socket.on(Events.CONNECTION_CLOSED, function (template) {
				render_manager.renderResponse(template, function () {
					socket.disconnect();
				});
			});

            // Let the server know we are connecting as a new player. This will kick off the application.
			socket.emit(Events.CLIENT_CONNECTED, isTeacher, /^ja\b/.test(navigator.language));

			Player.initializePlayer(isTeacher);

			if (urlRoom) {
				socket.on(Events.ROOM_JOINED, function (template) {
					render_manager.renderResponse(template);
					Player.getPlayer().room = urlRoom;
					view_username.start(urlRoom);
				});

				socket.emit(Events.JOIN_ROOM, urlRoom);
			}


		});
	}

	function toggleReconnectingMessage(show) {
		let notificationContainer = jQ(`#notificationContainer[data-key="reconnecting"]`);
		let isVisible = notificationContainer.length > 0;

		if (show && !isVisible) {
			showNotification(Messages.RECONNECTING, "reconnecting", {duration: 0, type:NOTICE_TYPES.warning});
		} else if (!show && isVisible) {
			removeNotification("reconnecting");
		}
	}

	//Opts:
	// type - one of NOTICE_TYPES
	// parent - the selector of the parent element (default: body)
	// duration - 0 to keep open (default: 2500)
	function showNotification(msg, key, opt) {

		let type = (opt?.type && NOTICE_TYPES.hasOwnProperty(opt.type)) ? opt.type : "";
		let parent = (opt?.parent && jQ(opt.parent).length !== 0) ? jQ(opt.parent) : jQ('body');

		if (!key || key.length === 0) {
			throw Error("You must specify a message key.");
		}

		let existingNotice = jQ(`div[data-key="${key}"`);

		if (existingNotice.length > 0) {
			existingNotice.remove();
		}

		const notificationTemplate =
			`<div id="notificationContainer" data-content="${msg}" class="${type}" data-key="${key}"></div>`;

		let notificationContainer = jQ().add(notificationTemplate).hide();

		parent.append(notificationContainer);
		notificationContainer.fadeIn(350);

		let duration = (opt && opt.hasOwnProperty("duration")) ? opt.duration : null;

		if (duration !== null && duration !== 0) {
			setTimeout(function() {
				notificationContainer.fadeOut(350, ()=> {
					notificationContainer.remove();
				});
			}, duration);
		} else if (duration === null) {
			setTimeout(function() {
				notificationContainer.fadeOut(350, ()=> {
					notificationContainer.remove();
				});
			}, DEFAULT_NOTICE_DURATION);
		}
	}



	function removeNotification(key) {

		if (!key || key.length === 0) {
			throw Error("You must specify a message key.");
		}

		let notificationContainer = jQ(`#notificationContainer[data-key="${key}"]`);

		notificationContainer.fadeOut(350, ()=> {
			notificationContainer.remove();
		});
	}

	function preload(imageArray, callbk, index) {
		// TODO: Add error handling
		index = index || 0;
		if (imageArray && imageArray.length > index) {
			let img = new Image ();
			img.onload = function() {
				preload(imageArray, callbk, index + 1);
			};
			img.src = imageRoot + imageArray[index];
		} else if (imageArray && imageArray.length > 0) {
			callbk();
		}
	}

	return {
		init : init,
		showNotification: showNotification,
		removeNotification: removeNotification,
		toggleReconnectingMessage: toggleReconnectingMessage,
		NOTICE_TYPES: NOTICE_TYPES,
		SERVER_PATH: SERVER_PATH
	};

});




