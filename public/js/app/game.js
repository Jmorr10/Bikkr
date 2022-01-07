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

"use strict";

/** @module app/game **/

/**
 * This module acts at the main point of entry for the application.
 * @author Joseph Morris <JRM.Softworks@gmail.com>
 * @version 1.0
 * @since 1.0
 */

// FIXME: If all vowel labels are disabled, then remove that button.
// TODO: Should be able to press a stop button to end the game and show the winner
// TODO: Should be able to display the round's winner AND ANSWER on the score pop-up, and then update scoreboard.

define(['jquery', 'app/render_manager', 'app/player', 'event_types'],
	function (jQ, render_manager, Player, Events) {

	require(['bootstrap'], function() {});


	const LOCAL = "http://127.0.0.1:5000";
	const HEROKU = 'https://dev-boinkikurenshuu.herokuapp.com';

	const SERVER_PATH = LOCAL;

	let imageRoot = "/static/img/";

	let socket = Player.getConnection();

	function init(isTeacher) {

		jQ('html').css('height', window.innerHeight + "px");

		jQ(window).on('orientationchange', function () {
			jQ(window).one('resize', function () {
                jQ('html').css('height', window.innerHeight + "px");
			});
        });

		preload([
			'group_selection.jpg',
			'room.png',
			'room_settings.png',
			'username.png'
		], function () {

            // Set up our template rendering system to receive templates from the server.
            socket.on(Events.RENDER_TEMPLATE, render_manager.renderResponse);

            // Let the server know we are connecting as a new player. This will kick off the application.
            socket.emit(Events.CLIENT_CONNECTED, isTeacher);

		});
	}

	function preload(imageArray, callbk, index) {
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
		SERVER_PATH: SERVER_PATH
	};

});




