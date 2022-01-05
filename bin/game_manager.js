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
const ConnectionManager = require('./connection_manager');
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

const DEFAULT_VOWELS = ["A", "AI", "E", "EE", "I", "IE", "O", "OA", "U", "UE"];

const VOWEL_LABELS = {
    "short_a": ["A", "/æ/"],
    "long_a": ["AI", "AY", "EY", "EIGH", "/eɪ/"],
    "short_e": ["E", "/ɛ/"],
    "long_e": ["EE", "EA", "IE", "/i/"],
    "short_i": ["I", "/I/"],
    "long_i": ["IE", "IGH", "/aɪ/"],
    "short_o": ["O", "/ɑ/"],
    "long_o": ["OA", "/oʊ/"],
    "short_u": ["U", "/ʊ/"],
    "long_u": ["UE", "OO", "EW", "/u/"]
};

let currentQuestion = "";
let questionActive = false;
let individualCounter = 0;
let groupsAnswered = {};
let ffaWinners = {};


function setQuestion(socket, roomID, questionSound, studentsPlaySound, vowelSounds) {
    questionSound = questionSound.toUpperCase();
    if (SOUNDS.hasOwnProperty(questionSound)) {
        currentQuestion = questionSound;
        questionActive = true;
        TemplateManager.sendPrecompiledTemplate(roomID, 'partials/vowel_grid_labels', {vowels: vowelSounds});
        let io = ConnectionManager.getIO();
        io.in(roomID).emit(Events.QUESTION_READY);
        if (studentsPlaySound) {
            socket.to(roomID).emit(Events.PLAY_SOUND, questionSound);
        }
        debug('Question set!');
    }
}


function processStudentResponseRWRT(socket, roomID, studentResponse) {
    if (questionActive) {

        studentResponse = studentResponse.toUpperCase();

        let room = RoomList.getRoomByID(roomID);
        let player = PlayerList.getPlayerBySocketID(socket.id);
        let isCorrect = studentResponse === currentQuestion;
        let isIndividualMode = room.type === RoomTypes.TYPE_INDIVIDUAL;
        let isAllForOneMode = room.type === RoomTypes.TYPE_GROUP && room.groupType === GroupTypes.TYPE_ALL_FOR_ONE;
        let isFreeForAllMode = room.type === RoomTypes.TYPE_GROUP && room.groupType === GroupTypes.TYPE_FREE_FOR_ALL;
        let currentQuestionTmp = currentQuestion;
        let failed = false;

        individualCounter++;

        if (isIndividualMode) {
            failed = processIndividualResponse(room, player, currentQuestionTmp, isCorrect);
        } else if (isAllForOneMode) {
            failed = processAllForOneResponse(room, player, currentQuestionTmp, studentResponse, isCorrect);
        } else {
            failed = processFreeForAllResponse(room, player, currentQuestionTmp, isCorrect);
        }


        if (isCorrect && !isFreeForAllMode) {
            questionActive = false;
            currentQuestion = "";
            individualCounter = 0;
            groupsAnswered = {};
            ffaWinners = {};
        }

        if (failed) {
            debug('Question failed! Resetting...');
            questionActive = false;
            currentQuestion = "";
            individualCounter = 0;
            groupsAnswered = {};
            ffaWinners = {};
            let groups = (!isAllForOneMode) ?
                room.groups : room.groups.sort(function (a,b) { return a.points < b.points; });
            TemplateManager.emitWithTemplate(
                roomID,
                'partials/leaderboard_content',
                {
                    players: room.players.sort(function (a,b) { return a.points < b.points; }),
                    roomType: room.type,
                    groupType: room.groupType,
                    groups: groups
                },
                Events.QUESTION_FAILED,
                currentQuestionTmp
            );
        }
    }
}

function processIndividualResponse(room, player, currentQuestionTmp, isCorrect) {
    if (isCorrect) {
        player.addPoints(1);
        TemplateManager.emitWithTemplate(
            room.id,
            'partials/leaderboard_content',
            {
                players: room.players.sort(function (a,b) { return a.points < b.points; }),
                roomType: room.type,
                groupType: room.groupType,
                winner: player
            },
            Events.QUESTION_FINISHED,
            currentQuestionTmp,
            player.points
        );
        debug('Question answered and finished!');
        return false;
    } else {
        if (individualCounter === room.playerCount) {
            // This question has been failed!
            return true;
        }
    }
}

function processAllForOneResponse(room, player, currentQuestionTmp, studentResponse, isCorrect) {
    let group = room.findGroupByPlayer(player);

        // Each group can only have one response for All-for-One mode
        if (groupsAnswered.hasOwnProperty(group.id)) {
            TemplateManager.emitWithTemplate(
                `${group.id}@${room.id}`,
                'partials/player_already_answered',
                {player: groupsAnswered[group.id],
                    myAnswer: studentResponse, correctAnswer: currentQuestionTmp},
                Events.QUESTION_ALREADY_ANSWERED,
                groupsAnswered[group.id]
            );
            return false;
        }

        if (isCorrect) {
            group.addPoints(1);
            TemplateManager.emitWithTemplate(
                room.id,
                'partials/leaderboard_content',
                {players: room.players.sort(function (a,b) { return a.points < b.points; }),
                    roomType: room.type,
                    groupType: room.groupType,
                    groups: room.groups.sort(function (a,b) { return a.points < b.points; })
                },
                Events.QUESTION_FINISHED,
                currentQuestionTmp,
                player.points
            );
            debug('Question answered and finished!');
            return false;

        } else {
            groupsAnswered[group.id] = player.name;
            return Util.getLen(groupsAnswered) === room.groupCount;
        }
}

function processFreeForAllResponse(room, player, currentQuestionTmp, isCorrect) {
    let group = room.findGroupByPlayer(player);

    if (isCorrect) {
        player.addPoints(1);

        if (!ffaWinners.hasOwnProperty(group.id)) {
            // Make note of the fastest player to answer correctly for each group
            ffaWinners[group.id] = player.name;
        }
    }

    if (individualCounter === room.playerCount) {
        if (Util.getLen(ffaWinners) === 0) {
            return true;
        } else {
            questionActive = false;
            currentQuestion = "";
            individualCounter = 0;
            groupsAnswered = {};

            TemplateManager.emitWithTemplate(
                room.id,
                'partials/leaderboard_content',
                {players: room.players.sort(function (a,b) { return a.points < b.points; }),
                    roomType: room.type,
                    groupType: room.groupType,
                    groups: room.groups,
                    winners: ffaWinners
                },
                Events.QUESTION_FINISHED,
                currentQuestionTmp,
                player.points
            );

            ffaWinners = {};

            debug('Question answered and finished!');
            return false;
        }
    }

}


function skipQuestion(socket, roomID, correctAnswer) {
    let room = RoomList.getRoomByID(roomID);
    if (room) {
        debug('Question skipped! Resetting...');
        questionActive = false;
        currentQuestion = "";
        individualCounter = 0;
        groupsAnswered = {};
        ffaWinners = {};
        TemplateManager.emitWithTemplate(
            roomID,
            'partials/leaderboard_content',
            {
                players: room.players.sort(function (a,b) { return a.points < b.points; }),
                roomType: room.type,
                groupType: room.groupType,
                groups: room.groups
            },
            Events.QUESTION_FAILED,
            correctAnswer
        );
    }
}

function playSound(socket, roomID, questionSound) {
    socket.to(roomID).emit(Events.PLAY_SOUND, questionSound);
}

module.exports = {
    setQuestion: setQuestion,
    processStudentResponse: processStudentResponseRWRT,
    skipQuestion: skipQuestion,
    playSound: playSound,
    DEFAULT_VOWELS: DEFAULT_VOWELS,
    VOWEL_LABELS: VOWEL_LABELS
};