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

/** @module app/view_room_options**/

/**
 * This module handles user interactions on the room options screen.
 *
 * @author Joseph Morris <JRM.Softworks@gmail.com>
 * @version 1.0
 * @since 1.0
 */
define(['jquery', 'app/socket_manager', 'app/player',  'app/render_manager', 'event_types'],
	function (jQ, socketManager, Player, roomOptions, username, render_manager, Events) {

	const socket = socketManager.getConnection();
	let player = Player.getPlayer();

	let submitBtn;
	let roomTypeField;
	let groupType;
	let errorLbl;

	const TYPE_GROUP = "typeGroup";
	const ERR_CHOOSE_GROUP_TYPE = "Please choose a group type!";

	function start() {

        submitBtn = jQ('#submitRoom');
        roomTypeField = jQ('input[name="roomType"]:checked').val();
        errorLbl = jQ('.error-lbl');

		submitBtn.click(submitOptions);

		socket.on(Events.ROOM_SET_UP, finish);

	}


	function submitOptions () {
		let options = {};
		let fieldValid = roomTypeField && roomTypeField !== "";

		if (fieldValid && roomTypeField === TYPE_GROUP) {
			let groupType = jQ('input[name="groupType"]:checked').val();
			if (groupType && groupType !== "") {
				options = {groupType: groupType};
			} else {
				setError(ERR_CHOOSE_GROUP_TYPE);
			}
		}

		if (fieldValid) {
			socket.emit(Events.ROOM_SETUP, roomTypeField, options);
		}

	}

	function setError (errorTxt) {
		errorLbl.text(errorTxt);
	}

	function finish (template) {
        render_manager.renderResponse(template);
		if (player.isTeacher) {
			roomOptions.start();
		} else {
			username.start();
		}
	}

	return {
		start: start
	};
	
});