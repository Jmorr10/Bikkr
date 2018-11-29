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

const RoomModule = require('./room');
const Room = RoomModule.Room;
const RoomTypes = {
    TYPE_GROUP: RoomModule.TYPE_GROUP,
    TYPE_INDIVIDUAL: RoomModule.TYPE_INDIVIDUAL
};

const GroupModule = require('./group');
const Group = GroupModule.Group;
const GroupTypes = {
    TYPE_ALL_FOR_ONE: GroupModule.TYPE_ALL_FOR_ONE,
    TYPE_FREE_FOR_ALL: GroupModule.TYPE_FREE_FOR_ALL
};

const ERR_ROOM_NAME_REQUIRED = 'You must enter a room name to begin!';
const ERR_MUST_BE_TEACHER = 'Students cannot create rooms!';

/**
 * Creates a player instance for the newly connected client and add it to the player list
 *
 * @param socket The socket of the connecting client
 */
function clientConnected(socket, isTeacher) {

    isTeacher = (isTeacher === true);

    let new_player = new Player(socket.id, isTeacher);
    new_player.socket = socket;
    PlayerList.addPlayer(new_player);

    TemplateManager.sendPrecompiledTemplate(socket.id, 'roomname', {isTeacher: isTeacher});

    debug(`Client ${socket.id} has connected!`);
    debug(`Players connected: ${PlayerList.getLength()}`);

}

/**
 * Upon disconnect, removes a player from the player list and
 * sends their opponent back to the player, if applicable.
 *
 * @param socket The socket of the disconnecting client
 */
function clientDisconnected(socket) {

    let player = PlayerList.getPlayerBySocketID(socket.id);
    if (player && player.isTeacher) {
        RoomList.destroyRooms(player);
        PlayerList.removePlayer(player);
    }

    if (player) {
        PlayerList.removePlayer(player);

        let playerGroups = player.getGroups();
        for (const [roomID, group] of Object.entries(playerGroups)) {
            group.removePlayer(player);
            // TODO Implement this
            TemplateManager.sendPrecompiledTemplate(roomID, 'partials/group_player_list', {players: group.players})
        }

        let playerRooms = player.getRooms();
        for (let i = 0; i < playerRooms.length; i++) {
            let room = playerRooms[i];
            room.removePlayer(player);
            TemplateManager.sendPrecompiledTemplate(room.id, 'partials/player_list', {players: room.players})
        }

    }


    debug(`Client ${socket.id} has disconnected!`);
    debug(`Players connected: ${PlayerList.getLength()}`);

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

    if (!player.isTeacher) {
        TemplateManager.sendPrecompiledTemplate(socket.id, 'partials/error', {errorTxt: ERR_MUST_BE_TEACHER});
        return;
    }

    if (validName && !roomExists) {
        let room = new Room(roomName, player);
        RoomList.addRoom(room);
        room.owner = player;
        room.addPlayer(player);

        debug(`Room Created: ${roomName}`);
        debug(`Sent room options`);
        TemplateManager.emitWithTemplate(socket.id, 'room_options', {roomID: roomName}, Events.ROOM_JOINED, roomName);

    } else if (roomExists) {
        roomName += "123456789".charAt(Math.floor(Math.random() * 10));
        createRoom(socket, roomName);
    } else {
        TemplateManager.sendPrecompiledTemplate(socket.id, 'partials/error', {errorTxt: ERR_ROOM_NAME_REQUIRED});
    }

}

function setupRoom(socket, roomID, roomType, options) {

    let player = PlayerList.getPlayerBySocketID(socket.id);
    let room = RoomList.getRoomByID(roomID);

    if (player.isTeacher) {
        if (roomType === RoomTypes.TYPE_INDIVIDUAL) {
            room.type = RoomTypes.TYPE_INDIVIDUAL;
        } else if (roomType === RoomTypes.TYPE_GROUP) {
            room.type = RoomTypes.TYPE_GROUP;
            options = options || {};
            room.groupType = (
                options.hasOwnProperty(GroupModule.KEY_GROUP_TYPE) && options.groupType === GroupTypes.TYPE_FREE_FOR_ALL)
                ? GroupTypes.TYPE_FREE_FOR_ALL : GroupTypes.TYPE_ALL_FOR_ONE;
        }
    }

    debug(`Room Setup: ${room.id} - ${room.type} - ${room.groupType}`);

    TemplateManager.emitWithTemplate(player.id, 'sound_grid', {players: PlayerList.getList()}, Events.ROOM_SET_UP);

}


function joinRoom(socket, roomID) {
    let player = PlayerList.getPlayerBySocketID(socket.id);
    if (!player.isTeacher) {
            let room = RoomList.getRoomByID(roomID);
            if (room) {
                room.addPlayer(player);
                debug(`Sent username selection`);
                TemplateManager.emitWithTemplate(socket.id, 'username', {roomID: room.id}, Events.ROOM_JOINED, room.id);
            } else {
                TemplateManager.sendPrecompiledTemplate(socket.id, 'partials/error', {errorTxt: 'Incorrect room name!'});
            }

    }
}


/**
 * Makes sure that the name or room name is not empty and is at least four characters in length
 *
 * @param name The name to validate
 * @returns {*|boolean} Whether or not the name is valid
 */
function isNameValid(name) {
    return (name && name !== "" && name.length >= 4) && !PlayerList.hasPlayerByName(name);
}

/**
 * Set a player's username (after validation) and sends them to the room upon validation.
 *
 * @param socket The socket of the player that is logging in
 * @param username The player's desired username
 */
function setUsername(socket, roomID, username) {

    if (isNameValid(username)) {
        let player = PlayerList.getPlayerBySocketID(socket.id);
        if (player) {
            let room = RoomList.getRoomByID(roomID);
            if (room) {
                player.name = username;
                TemplateManager.sendPrecompiledTemplate(roomID, 'partials/player_list', {players: room.players});
                let template = (room.type === RoomTypes.TYPE_GROUP) ? 'group_selection' : 'sound_grid_student';
                TemplateManager.emitWithTemplate(socket.id, template, {roomID: room.id}, Events.USERNAME_OK);
            }
        } else {
            TemplateManager.sendPrecompiledTemplate(socket.id, 'partials/error', {errorTxt: 'No matching user'});
        }

    } else {
        if (username && username.length < 4) {
            TemplateManager.sendPrecompiledTemplate(socket.id, 'partials/error', {errorTxt: 'Your username must be at least 4 characters in length.'});
        } else if (PlayerList.hasPlayerByName(username)) {
            TemplateManager.sendPrecompiledTemplate(socket.id, 'partials/error', {errorTxt: 'Username already in use.'});
        }
        else {
            TemplateManager.sendPrecompiledTemplate(socket.id, 'partials/error', {errorTxt: 'You must enter a username to begin!'});
        }
    }

}

module.exports = {
    clientConnected: clientConnected,
    clientDisconnected: clientDisconnected,
    setUsername: setUsername,
    createRoom: createRoom,
    setupRoom: setupRoom,
    joinRoom: joinRoom
};