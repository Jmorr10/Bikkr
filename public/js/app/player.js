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
define(['event_types'], function (Events) {
	
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

        get room() {
            return this._room;
        }

        set room(value) {
            this._room = value;
        }

        get points() {
            return this._points;
        }

        set points(value) {
            this._points = value;
        }

        get group() {
            return this._group;
        }

        set group(value) {
            this._group = value;
        }

	}

	function initializePlayer(isTeacher) {
        selfPlayer = new Player(socket.id, isTeacher);
	}

    function connect() {

        let wasConnected = false;

        if (socket) {
            socket.destroy();
            socket = null;
            wasConnected = true;
        }

        socket = io.connect(
            'http://localhost:5000',
            {
                reconnection: true,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 2000,
                reconnectionAttempts: Infinity
            }
        );

        socket.on('disconnect', function () {
            window.setTimeout(connect, 5000);
        });

        socket.on('connect', function () {
            let player = getPlayer();
            if (wasConnected && !player.isTeacher) {
                socket.emit(Events.RECONNECT, {
                    name: player.name,
                    room: player.room,
                    group: player.group,
                    points: player.points
                });
            }
        });

        window.getSocket = function () {
            return socket;
        }
    }

    function getPlayer() {
		return selfPlayer;
	}

	function getConnection() {
		return socket;
	}

	connect();

	return {
		getPlayer: getPlayer,
		initializePlayer: initializePlayer,
		getConnection: getConnection
	}

});