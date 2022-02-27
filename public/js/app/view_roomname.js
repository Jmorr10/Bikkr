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
define(['jquery', 'app/player', 'app/view_room_options', 'app/view_username', 'app/render_manager', 'event_types'],
	function (jQ, Player, roomOptions, username, render_manager, Events) {

	const socket = Player.getConnection();
	let player;

	let submitBtn;
	let roomNameField;
	let errorLbl;
	// This is a fix for iPhone not allowing JS to play sounds.
	const soundContainer = new Audio();
	soundContainer.autoplay = true;

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

		player = Player.getPlayer();

        roomNameField.focus();
	}


	function signIn () {
		// This is a workaround for playing audio on iOS devices.
		// See: https://stackoverflow.com/a/57547943
		soundContainer.src = "data:audio/mpeg;base64,SUQzBAAAAAABEVRYWFgAAAAtAAADY29tbWVudABCaWdTb3VuZEJhbmsuY29tIC8gTGFTb25vdGhlcXVlLm9yZwBURU5DAAAAHQAAA1N3aXRjaCBQbHVzIMKpIE5DSCBTb2Z0d2FyZQBUSVQyAAAABgAAAzIyMzUAVFNTRQAAAA8AAANMYXZmNTcuODMuMTAwAAAAAAAAAAAAAAD/80DEAAAAA0gAAAAATEFNRTMuMTAwVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQsRbAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQMSkAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV";
		Player.setSoundElement(soundContainer);
		let roomname = roomNameField.val();
		if (roomname && roomname !== '') {
			let event = (player.isTeacher) ? Events.NEW_ROOM : Events.JOIN_ROOM;
			socket.emit(event, roomname);
		} else {
			setError(ERR_NO_ROOMNAME);
		}
	}

	function setError (errorTxt) {
		errorLbl.text(errorTxt);
	}

	function finish (template, roomID) {
        render_manager.renderResponse(template);
        player.room = roomID;
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