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
 * Manages game events, scoring, etc.
 *
 * @author Joseph Morris <JRM.Softworks@gmail.com>
 * @version 1.0
 * @since 1.0
 */

/** @module game_manager **/

const debug = require('debug')('BoinKikuRenshuu:game');
const Events = require('./event_types');
const RoomList = require('./room_list');
const PlayerList = require('./player_list');
const Util = require('./util');

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

const SOUNDS = {
    A: "A",
    AI: "AI",
    E: "E",
    EE: "EE",
    I: "I",
    IE: "IE",
    O: "O",
    OA: "OA",
    U: "U",
    UE: "UE",
};

let currentQuestion = "";
let questionActive = false;
let individualCounter = 0;
let groupsAnswered = {};
let ffaWinners = {};


function setQuestion(socket, roomID, questionSound) {
    questionSound = questionSound.toUpperCase();
    if (SOUNDS.hasOwnProperty(questionSound)) {
        currentQuestion = questionSound;
        questionActive = true;
        socket.emit(Events.QUESTION_READY);
        socket.to(roomID).emit(Events.QUESTION_READY);
        debug('Question set!');
    }
}


function processStudentResponse(socket, roomID, studentResponse) {

    if (questionActive) {

        studentResponse = studentResponse.toUpperCase();

        let room = RoomList.getRoomByID(roomID);
        let player = PlayerList.getPlayerBySocketID(socket.id);
        let isCorrect = studentResponse === currentQuestion;
        let isIndividualMode = room.type === RoomTypes.TYPE_INDIVIDUAL;
        let isAllForOneMode = room.type === RoomTypes.TYPE_GROUP && room.groupType === GroupTypes.TYPE_ALL_FOR_ONE;
        let isFreeForAllMode = room.type === RoomTypes.TYPE_GROUP && room.groupType === GroupTypes.TYPE_FREE_FOR_ALL;
        let group;

        // Each group can only have ONE response for All-for-One mode
        if (!isIndividualMode) {
            group = room.findGroupByPlayer(player);

            if (isAllForOneMode) {
                // Each group can only have one response for All-for-One mode
                if (groupsAnswered.hasOwnProperty(group.id)) {
                    TemplateManager.emitWithTemplate(
                        `${group.id}@${room.id}`,
                        'partials/player_already_answered',
                        {player: groupsAnswered[group.id]},
                        Events.QUESTION_ALREADY_ANSWERED
                    );
                    return;
                }
            } else {
                // Each group can only have one winner for Free-for-All mode
                if (ffaWinners.hasOwnProperty(group.id)) {
                    return;
                }
            }

        }

        if (isCorrect && !isFreeForAllMode) {
            questionActive = false;
            currentQuestion = "";
            individualCounter = 0;
            groupsAnswered = {};
            ffaWinners = {};
        } else if (!isCorrect) {
            // We need to handle incorrect responses appropriately depending on the game's mode
            let failed = false;
            if (isIndividualMode || isFreeForAllMode) {
                individualCounter++;
                // Minus 1 to account for teacher
                if (individualCounter === room.playerCount) {
                    failed = true;
                }
            } else {
                // This, logically, must be All-for-One mode
                groupsAnswered[group.id] = player.name;
                if (Util.getLen(groupsAnswered) === room.groupCount) {
                    failed = true;
                }
            }

            if (failed) {
                debug('Question failed! Resetting...');
                questionActive = false;
                currentQuestion = "";
                individualCounter = 0;
                groupsAnswered = {};
                ffaWinners = {};
                TemplateManager.emitWithTemplate(
                    roomID,
                    'partials/player_scores',
                    {players: room.players, correctAnswer: currentQuestion},
                    Events.QUESTION_FAILED
                );
            }
        }

        if (isCorrect) {
            if (isIndividualMode) {
                player.addPoints(1);
                TemplateManager.emitWithTemplate(
                    roomID,
                    'partials/player_scores',
                    {players: room.players, winner: player.name, correctAnswer: studentResponse},
                    Events.QUESTION_FINISHED
                );
                debug('Question answered and finished!');
            } else if (isAllForOneMode) {
                group.addPoints(1);
                TemplateManager.emitWithTemplateArray(
                    roomID,
                    ['partials/player_scores', 'partials/group_scores'],
                    [{players: room.players, groups: room.groups, winner: player.name, correctAnswer: studentResponse}],
                    Events.QUESTION_FINISHED
                );
                debug('Question answered and finished!');
            } else if (isFreeForAllMode) {
                ffaWinners[group.id] = player.name;
                player.addPoints(1);
                if (Util.getLen(ffaWinners) === room.groupCount) {
                    questionActive = false;
                    currentQuestion = "";
                    individualCounter = 0;
                    groupsAnswered = {};
                    ffaWinners = {};

                    TemplateManager.emitWithTemplateArray(
                        roomID,
                        ['partials/player_scores', 'partials/group_scores', 'partials/ffa_scores'],
                        [{players: room.players, groups: room.groups, winners: ffaWinners, correctAnswer: studentResponse}],
                        Events.QUESTION_FINISHED
                    );
                    debug('Question answered and finished!');
                }
            }
        }
    }
}

module.exports = {
    setQuestion: setQuestion,
    processStudentResponse: processStudentResponse
};