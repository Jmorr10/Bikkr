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
 * Stores a list of active clients. Provide utility functions for retrieving players via their sockets.
 *
 * @author Joseph Morris <JRM.Softworks@gmail.com>
 * @version 1.0
 * @since 1.0
 */

/** @module player_list **/

/**
 * Internal representation of the player list
 *
 * @private
 * @type {{}}
 */

const Util = require('./util');
let players = {};

/**
 * Adds a Player instance to the player list
 *
 * @param player {Player} The Player class-instance to add to the list
 */
function addPlayer(player) {
    if (player && player.id !== "") {
        players[player.id] = player;
    }
}

/**
 * Removes a Player instance from the player list
 *
 * @param player {Player} The Player class-instance to remove from the list
 */
function removePlayer(player) {
    if (player && player.id !== "" && players.hasOwnProperty(player.id)) {
        delete players[player.id];
    }
}

function getPlayerBySocketID(socketID) {

    let player;

    if (Util.hasKey(players, socketID)) {
        player =  players[socketID];
    }

    return player;

}

function getPlayerByName(name) {
    for (const [key, val] of Object.entries(players)) {
        if (val.name.toLowerCase() === name.toLowerCase()) {
            return val;
        }
    }

    return null;
}

function getList() {
    return players;
}

function getLength() {
    return Util.getLen(players);
}

function reset() {
    players = {};
}

module.exports = {
    addPlayer: addPlayer,
    removePlayer: removePlayer,
    getPlayerBySocketID: getPlayerBySocketID,
    getList: getList,
    getLength: getLength,
    reset: reset,
    getPlayerByName: getPlayerByName
};

