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

/** @module room **/

const debug = require('debug')('BoinKikuRenshuu:room');
const util = require('./util');
const Events = require('./event_types');
const Group = require('./group');
const TYPE_GROUP = "group";
const TYPE_INDIVIDUAL = "individual";

/**
 * Represents a room and its state.
 *
 * @author Joseph Morris <JRM.Softworks@gmail.com>
 * @version 1.0
 * @since 1.0
 * @class
 */
class Room {

    /**
     * Creates a room instance and sets its default state.
     *
     * @param roomID The room's ID
     * @param owner {Player} The Player class-instance that owns this room
     */
    constructor(roomID, owner) {
        this.id = roomID;
        this.owner = owner;
        this.type = TYPE_INDIVIDUAL;
        this.players = {};
        this.groups = {};
        this.groupType = Group.TYPE_ALL_FOR_ONE;
    }

    get playerCount() {
        return util.getLen(this.players);
    }

    get groupCount() {
        return util.getLen(this.groups);
    }

    addPlayer(player) {
        if (player.socket) {
            player.socket.join(this.id);
            this.players[player.id] = player;
        }
    }

    removePlayer(player) {
        if (player.hasOwnProperty('id')) {
            player.socket.leave(this.id);
            delete this.players[player.id];
        }
    }

    addGroup(group) {
        if (group.hasOwnProperty('id')) {
            this.groups[group.id] = group;
        }
    }

    removeGroup(group) {
        if (group.hasOwnProperty('id')) {
            delete this.groups[group.id];
        }
    }

    hasPlayer(player) {
        return player.hasOwnProperty('id') && util.hasKey(this.players, player.id);
    }

    hasGroup(group) {
        return group.hasOwnProperty('id') && util.hasKey(this.groups, group.id);
    }

    destroy() {
        this.owner.socket.to(this.id).emit(Events.HOST_DISCONNECTED);
    }

}

module.exports = {
    Room: Room,
    TYPE_GROUP: TYPE_GROUP,
    TYPE_INDIVIDUAL: TYPE_INDIVIDUAL
};