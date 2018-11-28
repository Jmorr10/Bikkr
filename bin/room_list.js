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

const PlayerList = require('./player_list');

/**
 * Stores a list of room. Provide utility functions for retrieving players via their room, etc.
 *
 * @author Joseph Morris <JRM.Softworks@gmail.com>
 * @version 1.0
 * @since 1.0
 */

/** @module player_list **/

/**
 * Internal representation of the room list
 *
 * @private
 * @type {{}}
 */
let rooms = {};

function addRoom(roomID) {
    if (roomID && roomID !== "") {
        rooms[roomID] = {};
    }
}

function removeRoom(roomID) {
    if (roomID && roomID !== "" && hasKey(rooms, roomID)) {
        delete rooms[roomID];
    }
}

function addPlayer(roomID, socketID) {

    let player = PlayerList.getPlayerBySocketID(socketID);

    if (player && hasKey(rooms, roomID)) {
        if (getLen(rooms[roomID]) > 0 && !hasKey(rooms[roomID], socketID)) {
            rooms[roomID][socketID] = player;
            player.socket.join(roomID);
        }
    }


}

function removePlayer(roomID, socketID) {

    if (hasKey(roomID)) {
        delete rooms[roomID][socketID];
        
    }

}

function getPlayersByRoomID(roomID) {

    let players;

    if (hasKey(roomID)) {
        players =  rooms[roomID];
    }

    return players;

}

/**
 * A shorthand alias to help keep the code a little cleaner.
 *
 * @param obj The object being used
 * @param key The key being looked for
 * @returns {boolean}
 */

function hasKey(obj, key) {
    return obj.hasOwnProperty(key);
}

/**
 * Get the number of keys in an object.
 *
 * @param obj The object being counted
 * @returns {number} Number of active rooms
 */
function getLen(obj) {
    return Object.keys(obj).length;
}

function getList() {
    return rooms;
}

function getLength() {
    return getLen(rooms);
}

/**
 * Determines whether or not the room already exists
 *
 * @param roomID The roomID to validate
 * @returns {*|boolean} Whether or not the roomID exists
 */
function roomExists(roomID) {
    return hasKey(rooms, roomID);
}

module.exports = {
    addRoom: addRoom,
    removeRoom: removeRoom,
    addPlayer: addPlayer,
    removePlayer: removePlayer,
    getPlayersByRoomID: getPlayersByRoomID,
    getLength: getLength,
    getList: getList,
    roomExists: roomExists
};

