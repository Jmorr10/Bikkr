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

/** @module app/view_username**/

/**
 * This module handles user interactions on the username screen.
 *
 * @author Joseph Morris <JRM.Softworks@gmail.com>
 * @version 1.0
 * @since 1.0
 */
define(['jquery', 'app/socket_manager', 'app/view_group_selection', 'app/view_sound_grid_student', 'app/player', 'app/render_manager', 'event_types'],
	function (jQ, socketManager, groupSelection, soundGridStudent, Player, render_manager, Events) {

	const socket = socketManager.getConnection();
	let player;
	let submitBtn;
	let usernameField;
	let errorLbl;
	let roomID;

	const ERR_NO_USERNAME = 'Please enter a username to begin!';
	
	function start(rID) {
		player = Player.getPlayer();
		roomID = rID;
        submitBtn = jQ('#submitUsername');
        usernameField = jQ('#username');
        errorLbl = jQ('.error-lbl');

		submitBtn.click(signIn);

		usernameField.keypress(function (e) {
            if (e.which === 13) {
                signIn();
            }
        });
		
		socket.on(Events.USERNAME_OK, finish);

		usernameField.focus();
	}


	function signIn () {
		let username = usernameField.val();
		if (username && username !== '') {
			socket.emit(Events.SET_USERNAME, roomID, username);
		} else {
			setError(ERR_NO_USERNAME);
		}
	}

	function setError (errorTxt) {
		errorLbl.text(errorTxt);
	}

	function finish (template, playerName) {
        render_manager.renderResponse(template);
        player.name = playerName;
	}

	return {
		start: start
	};
	
});