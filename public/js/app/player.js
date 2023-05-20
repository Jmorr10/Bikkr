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
define(['event_types', 'app/messages'], function (Events, Messages) {
	
	let socket;
	let selfPlayer;
    let SERVER_PATH = window.location.origin;
    let soundElement;
    let gameRef;

    require(['app/game',], function (Game) {
        gameRef = Game;
    });


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
			this._group = null;
			this._points = 0;
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

        socket = io.connect(
            SERVER_PATH,
            {
                reconnection: true,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 2000,
                reconnectionAttempts: Infinity,
                closeOnBeforeunload: false,
                transports: ["websocket"]
            }
        );

        window.addEventListener('beforeunload',(event) =>{
            socket.emit(Events.DISCONNECTING);
        });

        socket.once(Events.SOCKET_CONNECTED, ping);

        socket.once("connect_error", (err) => {
            alert(Messages.get(Messages.keys.ERR_CANT_CONNECT_TO_SERVER));
        });

        socket.io.on('reconnect_attempt', function () {
            let player = getPlayer();
            if (!player.isTeacher) {
                gameRef.toggleReconnectingMessage(true);
            }
        });

        socket.io.on('reconnect', function () {
            let player = getPlayer();
            if (!player.isTeacher) {
                socket.emit(Events.CONNECT_AGAIN, {
                    name: player.name,
                    room: player.room,
                    points: player.points,
                    group: player.group
                });
                gameRef.toggleReconnectingMessage(false);
            }
        });
    }

    function ping() {
	    if (socket.connected) {
            socket.emit(Events.HEARTBEAT);
        }
        setTimeout(ping, 16000);
    }

    function getPlayer() {
		return selfPlayer;
	}

	function getConnection() {
		return socket;
	}

	function setSoundElement(el) {
	    soundElement = el;
    }

    function getSoundElement() {
	    return soundElement;
    }

	connect();

	return {
		getPlayer: getPlayer,
		initializePlayer: initializePlayer,
		getConnection: getConnection,
        setSoundElement: setSoundElement,
        getSoundElement: getSoundElement
	}

});