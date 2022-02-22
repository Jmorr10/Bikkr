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

/** @module player **/

const debug = require('debug')('BoinKikuRenshuu:player');
const PlayerList = require('./player_list');
const RoomList = require('./room_list');
const BASE_SCORE = 3000;

/**
 * Represents a player and its state.
 *
 * @author Joseph Morris <JRM.Softworks@gmail.com>
 * @version 1.0
 * @since 1.0
 * @class
 */
class Player {

    /**
     * Creates a player instance and sets its default state.
     *
     * @param socketID The socket which the player instance will represent
     * @param isTeacher Whether or not this player is the teacher
     */
    constructor(socketID, isTeacher) {
        this.id = socketID;
        this.isTeacher = (isTeacher === true);
        this.name = this.isTeacher ? "Teacher" : "";
        this._points = 0;
    }

    set name(name) {
        this._name = name.charAt(0).toUpperCase() + name.slice(1);
    }

    get name() {
        return this._name;
    }

    set socket(socket) {
        if (socket) {
            this._socket = socket;
        }
    }

    get socket() {
        return (this._socket) ? this._socket : PlayerList.getPlayerBySocketID(this.id);
    }

    get points() {
        return this._points;
    }

    /**
     * Adds a value to the points state member.
     *
     * @param val The value that will be added
     */
    addPoints(startTimer, endTimer) {
        let val = 100;
        let timeElapsed = endTimer - startTimer;
        val = Math.ceil(Math.max(BASE_SCORE - timeElapsed, val));
        this._points += val;
    }

    /**
     * Subtracts a value to the points state member.
     *
     * @param val The value that will be subtracted
     */
    subtractPoints(val) {
        this._points -= val;
    }

    /**
     * Resets a player's current points
     */
    resetPoints() {
        this._points = 0;
    }

    getRooms() {
        let rooms = RoomList.getList();
        let playerRooms = [];
        for (const [key, val] of Object.entries(rooms)) {
            if (val.hasPlayer(this)) {
                playerRooms.push(val);
            }
        }

        return playerRooms;
    }

    getGroups() {
        let playerRooms = this.getRooms();
        let playerGroups = {};
        for (let i = 0; i < playerRooms.length; i++) {
            let room = playerRooms[i];
            for (const group of room.groups) {
                if (group.hasPlayer(this)) {
                    playerGroups[room.id] = group;
                }
            }
        }

        return playerGroups;
    }

}

module.exports = Player;