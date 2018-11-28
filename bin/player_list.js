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
let players = {};

function addPlayer(player, socketID) {
    if (player && socketID && socketID !== "") {
        players[socketID] = player;
    }
}

function removePlayer(socketID) {
    if (socketID && socketID !== "" && hasKey(socketID)) {
        delete players[socketID];
    }
}

function getPlayerBySocketID(socketID) {

    let player;

    if (hasKey(socketID)) {
        player =  players[socketID];
    }

    return player;

}

/**
 * A shorthand alias to help keep the code a little cleaner.
 *
 * @param socketID
 * @returns {boolean}
 */

function hasKey(socketID) {
    return players.hasOwnProperty(socketID);
}

/**
 * Get the number of active players.
 *
 * @returns {number} Number of active players
 */
function getLen() {
    return Object.keys(players).length;
}

function getList() {
    return players;
}

module.exports = {
    addPlayer: addPlayer,
    removePlayer: removePlayer,
    getPlayerBySocketID: getPlayerBySocketID,
    getLen: getLen,
    getList: getList
};

