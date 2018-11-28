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
 * Manages client connections, invitations, and matchmaking.
 * When a match is made, this module initiates the first round of a game.
 *
 * @author Joseph Morris <JRM.Softworks@gmail.com>
 * @version 1.0
 * @since 1.0
 */

/** @module matchmaking_manager **/

const debug = require('debug')('BoinKikuRenshuu:matchmaking');
const Events = require('./event_types');
const Player = require('./player');
const PlayerList = require('./player_list');
const RoomList = require('./room_list');
const TemplateManager = require('./template_manager');

/**
 * Creates a player instance for the newly connected client and add it to the player list
 *
 * @param socket The socket of the connecting client
 */
function clientConnected(socket, isTeacher) {

    isTeacher = (isTeacher === true);

    let new_player = new Player(socket.id, isTeacher);
    new_player.socket = socket;
    PlayerList.addPlayer(new_player, socket.id);

    TemplateManager.sendPrecompiledTemplate(socket.id, 'roomname', {isTeacher: isTeacher});

    debug(`Client ${socket.id} has connected!`);
    debug(`Players connected: ${PlayerList.getLen()}`);

}

/**
 * Upon disconnect, removes a player from the player list and
 * sends their opponent back to the player, if applicable.
 *
 * @param socket The socket of the disconnecting client
 */
function clientDisconnected(socket) {

    //Just need player2, so the first is a dummy.
    // noinspection JSUnusedLocalSymbols

    debug(`Client ${socket.id} has disconnected!`);
    debug(`Players connected: ${PlayerList.getLen()}`);

}


/**
 * Creates a new game room
 * @param socket The socket of the teacher client
 * @param roomName {string} The desired name of the room
 */
function createRoom(socket, roomName) {

    let validName = isNameValid(roomName);
    let roomExists = RoomList.roomExists(roomName);
    let player = PlayerList.getPlayerBySocketID(socket.id);


    if (validName && !roomExists) {
        RoomList.addRoom(roomName);
        RoomList.addPlayer(roomName, socket.id);

        debug(`Room Created: ${roomName}`);

        if (player.isTeacher) {
            debug(`Sent room options`);
            TemplateManager.emitWithTemplate(socket.id, 'room_options', {}, Events.ROOM_JOINED);
        } else {
            debug(`Sent username selection`);
            TemplateManager.emitWithTemplate(socket.id, 'username', {}, Events.ROOM_JOINED);
        }

    } else if (roomExists) {
        roomName += "123456789".charAt(Math.floor(Math.random() * 10));
        createRoom(socket, roomName);
    } else {
        TemplateManager.sendPrecompiledTemplate(socket.id, 'error', {errorTxt: 'You must enter a room name to begin!'});
    }

}

function setupRoom(socket, roomType, options) {
    const TYPE_GROUP = "typeGroup";
    const TYPE_INDIVIDUAL = "typeIndividual";

    let player = PlayerList.getPlayerBySocketID(socket.id);

    if (roomType === TYPE_INDIVIDUAL) {
        if (player.isTeacher) {

        } else {

        }
    } else if (roomType === TYPE_GROUP) {

    }

}


/**
 * Makes sure that the name or room name is not empty and is at least four characters in length
 *
 * @param name The name to validate
 * @returns {*|boolean} Whether or not the name is valid
 */
function isNameValid(name) {
    return (name && name !== "" && name.length >= 4);
}

/**
 * Set a player's username (after validation) and sends them to the waiting room upon validation.
 *
 * @param socket The socket of the player that is logging in
 * @param username The player's desired username
 */
function setUsername(socket, username) {

    if (isNameValid(username)) {
        let player = PlayerList.getPlayerBySocketID(socket.id);
        if (player) {
            player.name = username;
            TemplateManager.emitWithTemplate(socket.id, 'waitingRoom',
                {username: player.name, inviteCode: player.inviteCode}, Events.LOGIN_SUCCESS, player.inviteCode);
        } else {
            TemplateManager.sendPrecompiledTemplate(socket.id, 'error', {errorTxt: 'No matching user'});
        }

    } else {
        if (username && username.length < 4) {
            TemplateManager.sendPrecompiledTemplate(socket.id, 'error', {errorTxt: 'Your username must be at least 4 characters in length.'});
        } else {
            TemplateManager.sendPrecompiledTemplate(socket.id, 'error', {errorTxt: 'You must enter a username to begin!'});
        }
    }

}

module.exports = {
    clientConnected: clientConnected,
    clientDisconnected: clientDisconnected,
    setUsername: setUsername,
    createRoom: createRoom
};