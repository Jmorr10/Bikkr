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
 * Provides a convenient enum of the various types of socket events.
 *
 * @author Joseph Morris <JRM.Softworks@gmail.com>
 * @version 1.0
 * @since 1.0
 */

/** @module event_types **/

// General - Socket.IO specific
const CONNECTION = 'connection';
const DISCONNECT = 'disconnect';
const LOGIN_SUCCESS = "login_success";

const CLIENT_CONNECTED = 'client_connected';
const NEW_ROOM = 'new_room';
const ROOM_JOINED = "room_joined";
const ROOM_SETUP = "room_setup";
const ROOM_SET_UP = "room_set_up";
const NEW_PLAYER = 'new_player';
const GAME_DISCONNECTED = 'game_disconnected';

// GUI
const RENDER_TEMPLATE = "render_template";

module.exports = {
    CONNECTION: CONNECTION,
    DISCONNECT: DISCONNECT,
    LOGIN_SUCCESS: LOGIN_SUCCESS,
    CLIENT_CONNECTED: CLIENT_CONNECTED,
    NEW_ROOM: NEW_ROOM,
    ROOM_JOINED: ROOM_JOINED,
    ROOM_SETUP: ROOM_SETUP,
    ROOM_SET_UP: ROOM_SET_UP,
    NEW_PLAYER: NEW_PLAYER,
    GAME_DISCONNECTED: GAME_DISCONNECTED,
    RENDER_TEMPLATE: RENDER_TEMPLATE,
};