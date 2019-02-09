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
define(['jquery', 'app/player', 'app/view_sound_grid', 'app/render_manager', 'event_types'],
	function (jQ, Player, soundGrid, render_manager, Events) {

	const socket = Player.getConnection();
	let player;

	let submitBtn;
	let roomTypeField;
	let roomID;
	let errorLbl;

	const TYPE_GROUP = "group";
	const ERR_CHOOSE_GROUP_TYPE = "Please choose a group type!";
	const ERR_TOO_FEW_STUDENTS= "You must have at least four students for groups!";

	function start(rID) {

		roomID = rID;
        submitBtn = jQ('#submitRoomOptions');
        errorLbl = jQ('.error-lbl');

		submitBtn.click(submitOptions);

		socket.on(Events.ROOM_SET_UP, finish);
        player = Player.getPlayer();

	}


	function submitOptions () {
		let options = {};
		roomTypeField = jQ('input[name="roomType"]:checked').val();
		let fieldValid = roomTypeField && roomTypeField !== "";

		if (fieldValid && roomTypeField === TYPE_GROUP) {
			let numStudents = jQ('#numStudents').val();
			let groupType = jQ('input[name="groupType"]:checked').val();
			let assignGroups = jQ('#assignGroups').prop('checked');

			if (groupType && groupType !== "" && numStudents) {
				options = {groupType: groupType, numStudents: numStudents, assignGroups: assignGroups};
			} else if (numStudents && numStudents < 4) {
				setError(ERR_TOO_FEW_STUDENTS);
			} else {
                setError(ERR_CHOOSE_GROUP_TYPE);
			}
		}

		if (fieldValid) {
			socket.emit(Events.ROOM_SETUP, roomID, roomTypeField, options);
		}

	}

	function setError (errorTxt) {
		errorLbl.text(errorTxt);
	}

	function finish (template) {
        render_manager.renderResponse(template);
		if (player.isTeacher) {
			soundGrid.start(roomID);
		}
	}

	return {
		start: start
	};
	
});