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

/**
 * Adds listeners for matchmaking-related events to the socket connection
 *
 * @author Joseph Morris <JRM.Softworks@gmail.com>
 * @version 1.0
 * @since 1.0
 */

/** @module matchmaking_events **/

const Events = require('./event_types');
const MatchmakingManager = require('./matchmaking_manager');

/**
 * Adds listeners to the socket
 *
 * @param socket The socket connection to listen on.
 */
function addSocketListeners (socket) {

    socket.on(Events.CLIENT_CONNECTED, MatchmakingManager.clientConnected.bind(null, socket));
    socket.on(Events.DISCONNECT, MatchmakingManager.clientDisconnected.bind(null, socket));
    socket.on(Events.SET_USERNAME, MatchmakingManager.setUsername.bind(null, socket));
    socket.on(Events.NEW_ROOM, MatchmakingManager.createRoom.bind(null, socket));
    socket.on(Events.JOIN_ROOM, MatchmakingManager.joinRoom.bind(null, socket));
    socket.on(Events.ROOM_SETUP, MatchmakingManager.setupRoom.bind(null, socket));
    socket.on(Events.JOIN_GROUP, MatchmakingManager.joinGroup.bind(null, socket));

}

module.exports = addSocketListeners;