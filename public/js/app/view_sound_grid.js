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

/** @module app/view_roomname**/

/**
 * This module handles user interactions on the roomname screen.
 *
 * @author Joseph Morris <JRM.Softworks@gmail.com>
 * @version 1.0
 * @since 1.0
 */
define(['jquery', 'app/socket_manager', 'app/player', 'app/view_room_options', 'app/view_username', 'app/render_manager', 'event_types'],
	function (jQ, socketManager, Player, roomOptions, username, render_manager, Events) {

	const socket = socketManager.getConnection();
	let player = Player.getPlayer();

	let submitBtn;
	let roomNameField;
	let errorLbl;

	const ERR_NO_ROOMNAME = 'Please enter a room name to begin!';
	
	function start() {

        submitBtn = jQ('#submitRoom');
        roomNameField = jQ('#roomName');
        errorLbl = jQ('.error-lbl');

		submitBtn.click(signIn);

		roomNameField.keypress(function (e) {
            if (e.which === 13) {
                signIn();
            }
        });
		
		socket.on(Events.ROOM_JOINED, finish);

	}


	function signIn () {
		let roomname = roomNameField.val();
		if (roomname && roomname !== '') {
			socket.emit(Events.NEW_ROOM, roomname);
		} else {
			setError(ERR_NO_ROOMNAME);
		}
	}

	function setError (errorTxt) {
		errorLbl.text(errorTxt);
	}

	function finish (template, roomID) {
        render_manager.renderResponse(template);
		if (player.isTeacher) {
			roomOptions.start(roomID);
		} else {
			username.start(roomID);
		}
	}

	return {
		start: start
	};
	
});