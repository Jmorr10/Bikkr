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
const Util = require('./util');
const TemplateManager = require('./template_manager');
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
        this.players = [];
        this.groups = [];
        this.groupType = Group.TYPE_ALL_FOR_ONE;
        this.groupsAssigned = false;
        this.setUp = false;
    }

    get playerCount() {
        return this.players.length;
    }

    get groupCount() {
        return this.groups.length;
    }

    addPlayer(player, isTeacher) {
        if (player.socket) {
            player.socket.join(this.id);
            if (!isTeacher) {
                this.players.push(player);
            }
        }
    }

    removePlayer(player) {
        if (player.hasOwnProperty('id')) {
            player.socket.leave(this.id);
            let idx = this.players.indexOf(player);
            if (idx !== -1) {
                this.players.splice(idx,1);
            }
        }
    }

    addGroup(group) {
        if (group.hasOwnProperty('id')) {
            if (!this.hasGroup(group)) {
                this.groups.push(group);
            }
        }
    }

    removeGroup(group) {
        if (group.hasOwnProperty('id')) {
            let groupIdx = this.getGroupIndex(group);
            if (groupIdx !== -1) {
                this.groups.splice(groupIdx, 1);
            }
        }
    }

    hasPlayer(player) {
        return player.hasOwnProperty('id') && this.players.indexOf(player) !== -1;
    }

    hasGroup(group) {
        if (group.hasOwnProperty('id')) {
           return this.getGroupIndex(group) !== -1;
        }

        return false;
    }

    hasGroupByID(groupID) {
        return this.hasGroup({"id": groupID});
    }

    getGroupIndex(group) {

        let idx = -1;

        if (group.hasOwnProperty('id')) {
            for (let i = 0; i < this.groups.length; i++) {
                if (this.groups[i].id === group.id) {
                    idx = i;
                    break;
                }
            }
        }

        return idx;
    }

    getGroupByID(groupID) {
        let group = false;
        let groupIdx = this.getGroupIndex({"id": groupID});
        if (groupIdx !== -1) {
            group = this.groups[groupIdx];
        }

        return group;
    }

    destroy() {
        TemplateManager.sendPrecompiledTemplate(this.id, 'disconnected', {});
        this.owner.socket.to(this.id).emit(Events.DISCONNECT);
    }

    findGroupByPlayer(player) {
        let noMatch = false;

        if (player && this.hasPlayer(player)) {
            for (const group of this.groups) {
                if (group.hasPlayer(player)) {
                    return group;
                }
            }
        }

        return noMatch;
    }

    assignPlayerToGroup(player, exceedBase) {

        if (exceedBase) {
            let group = this.groups.slice(0).sort(
                function (a, b) {
                    if (a.playerCount === b.playerCount) {
                        return a.id > b.id;
                    }

                    return a.playerCount > b.playerCount;
                })[0];
            group.addPlayer(this, player);
            debug(`Added ${player.name} to ${group.id}`);
            return group;
        }

        for (const group of this.groups) {
            if (group.playerCount < group.baseNumber) {
                group.addPlayer(this, player);
                debug(`Added ${player.name} to ${group.id}`);
                return group;
            }
        }

        //If we reach this point, we need to make another loop to add the player to next group.
        return this.assignPlayerToGroup(player, true);
    }

}

module.exports = {
    Room: Room,
    TYPE_GROUP: TYPE_GROUP,
    TYPE_INDIVIDUAL: TYPE_INDIVIDUAL
};