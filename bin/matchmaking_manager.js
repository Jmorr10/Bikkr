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

const GameManager = require('./game_manager');
const DEFAULT_VOWELS = GameManager.DEFAULT_VOWELS;
const VOWEL_LABELS = GameManager.VOWEL_LABELS;


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
const ERR_ROOM_NAME_TOO_SHORT = 'Room name must be at least 4 characters long.';
const ERR_MUST_BE_TEACHER = 'Students cannot create rooms!';
const ERR_INVALID_ROOM_OPTIONS = 'Invalid room options!';

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

    // TODO: Need to test the whole reconnection flow


    let player = PlayerList.getPlayerBySocketID(socket.id);
    if (player && player.isTeacher) {
        RoomList.destroyRooms(player);
        PlayerList.removePlayer(player);
    }

    if (player) {
        PlayerList.removePlayer(player);

        let playerGroups = player.getGroups();
        for (const [roomID, group] of Object.entries(playerGroups)) {
            let room = RoomList.getRoomByID(roomID);
            group.removePlayer(room, player);
        }

        let playerRooms = player.getRooms();
        for (let i = 0; i < playerRooms.length; i++) {
            let room = playerRooms[i];
            room.removePlayer(player);
            TemplateManager.emitWithTemplateArray(
                room.id,
                ['partials/player_list_content', 'partials/leaderboard_content'],
                [{
                    players: room.players,
                    roomType: room.type,
                    groupType: room.groupType,
                    groups: room.groups
                }],
                Events.RENDER_TEMPLATE
            );
        }

    }

    debug(`Client ${socket.id} has disconnected!`);
    debug(`Players connected: ${PlayerList.getLength()}`);

}

function kickPlayer(socket, playerID) {
    if (playerID) {
        let player = PlayerList.getPlayerBySocketID(playerID);
        if (player) {
            TemplateManager.sendPrecompiledTemplate(playerID, 'kicked', {});
            player.socket.emit(Events.DISCONNECT);
        }
    }
}


/**
 * Creates a new game room
 * @param socket The socket of the teacher client
 * @param roomName {string} The desired name of the room
 */
function createRoom(socket, roomName) {

    let validName = isRoomNameValid(roomName);
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
        room.addPlayer(player, true);

        debug(`Room Created: ${roomName}`);
        debug(`Sent room options`);
        TemplateManager.emitWithTemplate(socket.id, 'room_options', {roomID: roomName}, Events.ROOM_JOINED, roomName);

    } else if (roomExists) {
        roomName += "123456789".charAt(Math.floor(Math.random() * 10));
        createRoom(socket, roomName);
    } else if (roomName && roomName.length < 4) {
        TemplateManager.sendPrecompiledTemplate(socket.id, 'partials/error', {errorTxt: ERR_ROOM_NAME_TOO_SHORT});
    } else {
        TemplateManager.sendPrecompiledTemplate(socket.id, 'partials/error', {errorTxt: ERR_ROOM_NAME_REQUIRED});
    }

}

function setupRoom(socket, roomID, roomType, options) {

    let player = PlayerList.getPlayerBySocketID(socket.id);
    let room = RoomList.getRoomByID(roomID);

    if (player && player.isTeacher) {
        if (roomType === RoomTypes.TYPE_INDIVIDUAL) {
            room.type = RoomTypes.TYPE_INDIVIDUAL;
        } else if (roomType === RoomTypes.TYPE_GROUP) {
            room.type = RoomTypes.TYPE_GROUP;
            if (options && options.hasOwnProperty(GroupModule.KEY_NUM_STUDENTS)) {
                room.groupType = (
                    options.hasOwnProperty(GroupModule.KEY_GROUP_TYPE) && options.groupType === GroupTypes.TYPE_FREE_FOR_ALL)
                    ? GroupTypes.TYPE_FREE_FOR_ALL : GroupTypes.TYPE_ALL_FOR_ONE;
                createGroups(room, options.numStudents);
                room.groupsAssigned = (options.hasOwnProperty(GroupModule.KEY_ASSIGN_GROUPS)) ? options.assignGroups : false;
            } else {
                TemplateManager.sendPrecompiledTemplate(socket.id, 'partials/error', {errorTxt: ERR_INVALID_ROOM_OPTIONS});
                return;
            }

        }
    }

    debug(`Room Setup: ${room.id} - ${room.type} - ${room.groupType}`);
    room.setUp = true;

    // Teacher sound grid should be locked until start is pressed.
    TemplateManager.emitWithTemplate(player.id, 'sound_grid',
        {players: room.players, roomType: room.type, groupType: room.groupType, roomID: room.id, locked: true, vowels: VOWEL_LABELS}, Events.ROOM_SET_UP);

}

function createGroups(room, numStudents) {
    // This ugly piece of code means that base should be 2 for 10 students or less, 4 for 11 <= x < 25, and 5 for x >= 25
    let base = (numStudents < 25) ? (numStudents < 16) ? 2 : 4 : GroupModule.BASE_STUDENTS_PER_GROUP;
    let numGroups = Math.floor(numStudents / base);
    for (let i = 1; i <= numGroups; i++) {
        room.addGroup(new Group(`Group ${i}`, base));
    }
}


function joinRoom(socket, roomID) {
    let player = PlayerList.getPlayerBySocketID(socket.id);
    if (player && !player.isTeacher) {
            let room = RoomList.getRoomByID(roomID);
            if (room && !room.setUp) {
                TemplateManager.sendPrecompiledTemplate(socket.id, 'partials/error', {errorTxt: 'The teacher has not finished setting up the room!'});
            } else if (room) {
                room.addPlayer(player);
                debug(`Sent username selection`);
                TemplateManager.emitWithTemplate(socket.id, 'username', {roomID: room.id}, Events.ROOM_JOINED, room.id);
            } else {
                TemplateManager.sendPrecompiledTemplate(socket.id, 'partials/error', {errorTxt: 'Incorrect room name!'});
            }

    }
}


function joinGroup(socket, roomID, groupID) {
    let player = PlayerList.getPlayerBySocketID(socket.id);
    if (player && !player.isTeacher) {
        let room = RoomList.getRoomByID(roomID);
        if (room) {

            let group;

            if (room.groupsAssigned) {
                group = room.assignPlayerToGroup(player);
            } else if (room.hasGroupByID(groupID)) {
                group = room.getGroupByID(groupID);
                group.addPlayer(room, player);
            } else {
                TemplateManager.sendPrecompiledTemplate(socket.id, 'partials/error', {errorTxt: 'Error joining group!'});
            }

            debug(`${player.name} joined ${group.id}`);

            // Student sound grid should be locked initially
            TemplateManager.emitWithTemplate(socket.id, 'sound_grid_student', {
                roomID: room.id,
                locked: true,
                buttons: DEFAULT_VOWELS,
                groups: room.groups,
                groupID: groupID,
                player: player,
                roomType: room.type,
                groupType: room.groupType}, Events.GROUP_JOINED, roomID);

            TemplateManager.emitWithTemplateArray(
                roomID,
                ['partials/player_list_content', 'partials/leaderboard_content'],
                [{players: room.players,
                    roomType: room.type,
                    groupType: room.groupType,
                    groups: room.groups
                }],
                Events.RENDER_TEMPLATE
            );



        } else {
            TemplateManager.sendPrecompiledTemplate(socket.id, 'partials/error', {errorTxt: 'Incorrect room name!'});
        }

    }
}

/**
 * Makes sure that room name is not empty and is at least four characters in length
 *
 * @param name The name to validate
 * @returns {*|boolean} Whether or not the name is valid
 */
function isRoomNameValid(name) {
    //return (name && name !== "" && name.length >= 4) && !PlayerList.hasPlayerByName(name);
    return (name && name !== "" && name.length >= 4);
}

/**
 * Makes sure that the name is not empty and is at least four characters in length
 *
 * @param name The name to validate
 * @returns {*|boolean} Whether or not the name is valid
 */
function isUserNameValid(name) {
    return (name && name !== "" && name.length >= 4) && !PlayerList.hasPlayerByName(name);
}

/**
 * Set a player's username (after validation) and sends them to the room upon validation.
 *
 * @param socket The socket of the player that is logging in
 * @param username The player's desired username
 */
function setUsername(socket, roomID, username) {

    if (isUserNameValid(username)) {
        let player = PlayerList.getPlayerBySocketID(socket.id);
        if (player) {
            let room = RoomList.getRoomByID(roomID);
            if (room) {
                player.name = username;
                TemplateManager.sendPrecompiledTemplate(roomID, 'partials/player_list_content', {players: room.players, roomType: room.type, groupType: room.groupType, groups: room.groups});
                let template = (room.type === RoomTypes.TYPE_GROUP && !room.groupsAssigned) ? 'group_selection' : 'sound_grid_student';

                let group;
                let groupID = "";

                if (room.groupsAssigned) {
                    group = room.assignPlayerToGroup(player);
                    groupID = (group && group.hasOwnProperty('id')) ? group.id : groupID;
                }

                // Student sound grid should be locked initially
                TemplateManager.emitWithTemplate(socket.id, template, {
                    roomID: room.id,
                    locked: true,
                    buttons: DEFAULT_VOWELS,
                    groups: room.groups,
                    groupID: groupID,
                    player: player,
                    roomType: room.type,
                    groupType: room.groupType}, Events.USERNAME_OK, player.name, roomID, groupID);

                TemplateManager.sendPrecompiledTemplate(
                    roomID,
                    'partials/leaderboard_content',
                    {players: room.players,
                        roomType: room.type,
                        groupType: room.groupType,
                        groups: room.groups
                    }
                );
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

function reconnectPlayer(socket, playerState) {
    let new_player = new Player(socket.id, false);
    new_player.socket = socket;
    PlayerList.addPlayer(new_player);
    let room = RoomList.getRoomByID(playerState.room);
    let group;

    if (room) {
        room.addPlayer(new_player);
    }

    new_player.name = playerState.name;

    if (room && room.type === RoomTypes.TYPE_GROUP) {
        group = room.getGroupByID(playerState.group);
        group.addPlayer(room, new_player);
    }

    // Student sound grid should be locked initially
    TemplateManager.sendPrecompiledTemplate(socket.id, 'sound_grid_student', {
        roomID: room.id,
        locked: true,
        buttons: DEFAULT_VOWELS,
        groups: room.groups,
        groupID: group.id,
        player: new_player,
        roomType: room.type,
        groupType: room.groupType});

    TemplateManager.sendPrecompiledTemplate(
        room.id,
        'partials/leaderboard_content',
        {players: room.players,
            roomType: room.type,
            groupType: room.groupType,
            groups: room.groups
        }
    );

}

module.exports = {
    clientConnected: clientConnected,
    clientDisconnected: clientDisconnected,
    kickPlayer: kickPlayer,
    setUsername: setUsername,
    createRoom: createRoom,
    setupRoom: setupRoom,
    joinRoom: joinRoom,
    joinGroup: joinGroup,
    reconnectPlayer: reconnectPlayer
};