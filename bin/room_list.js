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

const Util = require('./util');

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

/**
 * Add a room to the room list
 *
 * @param room {Room} The Room class-instance to add
 */
function addRoom(room) {
    if (room && room.id !== "") {
        rooms[room.id] = room;
    }
}

/**
 * Remove a room from the room list
 *
 * @param room {Room} The Room class-instance to remove
 */
function removeRoom(room) {
    if (room && room.id !== "" && Util.hasKey(rooms, room.id)) {
        delete rooms[room.id];
    }
}


/**
 * Removes a teacher's room upon disconnect.
 *
 * @param owner {Player} The Player class-instance that owns the rooms
 */
function destroyRooms(owner) {
    for (const [key, val] of Object.entries(rooms)) {
        if (val.owner.id === owner.id) {
            removeRoom(val);
        }
    }
}


function getList() {
    return rooms;
}

function getLength() {
    return Util.getLen(rooms);
}

function reset() {
    rooms = {};
}


/**
 * Returns a room by its ID
 *
 * @param roomID The room ID to search for
 * @returns {Room|boolean} Returns the room is found, or false if not found
 */
function getRoomByID(roomID) {
    return (roomExists(roomID)) ? rooms[roomID] : false;
}


/**
 * Determines whether or not the room already exists
 *
 * @param roomID The roomID to validate
 * @returns {*|boolean} Whether or not the roomID exists
 */
function roomExists(roomID) {
    return Util.hasKey(rooms, roomID);
}

module.exports = {
    addRoom: addRoom,
    removeRoom: removeRoom,
    destroyRooms: destroyRooms,
    getLength: getLength,
    getList: getList,
    roomExists: roomExists,
    getRoomByID: getRoomByID,
    reset: reset
};

