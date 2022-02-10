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

/** @module group **/

const debug = require('debug')('BoinKikuRenshuu:group');
const Util = require('./util');
const TYPE_FREE_FOR_ALL = "freeForAll";
const TYPE_ALL_FOR_ONE = "allForOne";
const KEY_GROUP_TYPE = 'groupType';
const KEY_NUM_STUDENTS = 'numStudents';
const KEY_ASSIGN_GROUPS = 'assignGroups';
const BASE_STUDENTS_PER_GROUP = 5;

/**
 * Represents a group and its state.
 *
 * @author Joseph Morris <JRM.Softworks@gmail.com>
 * @version 1.0
 * @since 1.0
 * @class
 */
class Group {

    /**
     * Creates a group instance and sets its default state.
     *
     * @param groupID The group's ID
     * @param baseNumber The number of members group will initially accept before overloading
     */
    constructor(groupID, baseNumber) {
        this.id = groupID;
        this.type = TYPE_ALL_FOR_ONE;
        this.players = {};
        this._points = 0;
        this.baseNumber = baseNumber;
    }

    get points() {
        return this._points;
    }

    /**
     * Adds a value to the points state member.
     *
     * @param val The value that will be added
     */
    addPoints(val) {
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

    get playerCount() {
        return Util.getLen(this.players);
    }


    // noinspection JSUnusedGlobalSymbols
    // This function is used in a template
    get playerScores() {
        let playerScores = [];
        for (const [k,v] of Object.entries(this.players)) {
            playerScores.push({name: v.name, points: v.points, id: v.id});
        }

        return playerScores.sort((a, b) => b.points - a.points);
    }

    /**
     * Adds a player to this group and joins the group socket room
     *
     * @param room {Room} The room that this group is associated with
     * @param player {Player} The Player class-instance to add to the group
     */
    addPlayer(room, player) {
        if (player.socket) {
            player.socket.join(`${this.id}@${room.id}`);
            this.players[player.id] = player;
        }
    }

    /**
     * Removes a player from this group and leaves the group socket room
     *
     * @param room {Room} The room that this group is associated with
     * @param player {Player} The Player class-instance to remove from the group
     */
    removePlayer(room, player) {
        if (player.hasOwnProperty('id')) {
            player.socket.leave(`${this.id}@${room.id}`);
            delete this.players[player.id];
        }
    }

    /**
     * Whether or not this group contains the given Player
     *
     * @param player {Player} The Player class-instance to check for
     * @returns {boolean} Whether or not the Player is in the group.
     */
    hasPlayer(player) {
        return player.hasOwnProperty('id') && Util.hasKey(this.players, player.id);
    }

}

module.exports = {
    Group: Group,
    TYPE_ALL_FOR_ONE: TYPE_ALL_FOR_ONE,
    TYPE_FREE_FOR_ALL: TYPE_FREE_FOR_ALL,
    KEY_GROUP_TYPE: KEY_GROUP_TYPE,
    KEY_NUM_STUDENTS: KEY_NUM_STUDENTS,
    BASE_STUDENTS_PER_GROUP: BASE_STUDENTS_PER_GROUP,
    KEY_ASSIGN_GROUPS: KEY_ASSIGN_GROUPS
};