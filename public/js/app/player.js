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

/** @module app/player **/

/**
 * This module acts as the client-side version of the Player class.
 * @author Joseph Morris <JRM.Softworks@gmail.com>
 * @version 1.0
 * @since 1.0
 */
define(['app/socket_manager'], function (socketManager) {
	
	let socket;
	let selfPlayer;

    /**
     * Represents a client-side player and its state.
     *
     * @author Joseph Morris <JRM.Softworks@gmail.com>
     * @version 1.0
     * @since 1.0
     * @class
     */
	class Player {
		
		constructor(socketID, isTeacher) {
			this.id = socketID;
			this.isTeacher = (isTeacher === true);
		}
		
		set name(name) {
			this._name = name;
		}
		
		get name() {
			return this._name;
		}

		// TODO - Clean this up...
		set state(state) {
			this._state = state;
			if (this.id === "" && state.id) {
				this.id = state.id;
			}
			if (!this._name && state.name) {
				this._name = state.name;
			}
		}
		
		get state() {
			return this._state;
		}

	}

	function initializePlayer(isTeacher) {
        socket = socketManager.getConnection();
        selfPlayer = new Player(socket.id, isTeacher);
	}

    function getPlayer() {
		return selfPlayer;
	}

	return {
		getPlayer: getPlayer,
		initializePlayer: initializePlayer
	}

});