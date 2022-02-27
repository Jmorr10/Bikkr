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
const performance = require('perf_hooks').performance;

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
    SHORT_A: "SHORT_A",
    LONG_A: "LONG_A",
    SHORT_E: "SHORT_E",
    LONG_E: "LONG_E",
    SHORT_I: "SHORT_I",
    LONG_I: "LONG_I",
    SHORT_O: "SHORT_O",
    LONG_O: "LONG_O",
    SHORT_U: "SHORT_U",
    LONG_U: "LONG_U",
};

const DEFAULT_VOWELS = [
    {sound: "SHORT_A", label:"a"},
    {sound: "LONG_A", label:"ai"},
    {sound: "SHORT_E", label:"e"},
    {sound: "LONG_E", label:"ee"},
    {sound: "SHORT_I", label:"i"},
    {sound: "LONG_I", label:"ie"},
    {sound: "SHORT_O", label:"o"},
    {sound: "LONG_O", label:"oa"},
    {sound: "SHORT_U", label:"u"},
    {sound: "LONG_U", label:"ue"}
];

const VOWEL_LABELS = {
    "SHORT_A": ["/æ/", "a"],
    "LONG_A": ["/eɪ/", "ai", "ay", "ey", "eigh"],
    "SHORT_E": ["/ɛ/", "e"],
    "LONG_E": ["/i/", "ee", "ea", "ie"],
    "SHORT_I": ["/I/", "i"],
    "LONG_I": ["/aɪ/", "ie", "igh"],
    "SHORT_O": ["/ɑ/", "o"],
    "LONG_O": ["/oʊ/", "oa"],
    "SHORT_U": ["/ʊ/", "u"],
    "LONG_U": ["/u/", "ue", "oo", "ew"]
};

let currentQuestion = "";
let questionActive = false;
let individualCounter = 0;
let groupsAnswered = {};
let ffaWinners = {};
let answerTimer = performance.now();

class Button {
    constructor(sound, label) {
        this.sound = sound;
        this.label = label;
    }
}

function resetTrackingVariables() {
    currentQuestion = "";
    questionActive = false;
    individualCounter = 0;
    groupsAnswered = {};
    ffaWinners = {};
    answerTimer = null;
}


function setQuestion(socket, roomID, questionSound, buttonOptions, studentsPlaySound) {
    let player = PlayerList.getPlayerBySocketID(socket.id);
    if (SOUNDS.hasOwnProperty(questionSound) && player.isTeacher) {
        currentQuestion = questionSound;
        questionActive = true;
        let room = RoomList.getRoomByID(roomID);
        let buttons = getButtons(room, buttonOptions);
        TemplateManager.sendPrecompiledTemplate(roomID, 'partials/vowel_grid',
            {locked: false, buttons: buttons});
        let io = ConnectionManager.getIO();
        io.in(roomID).emit(Events.QUESTION_READY);
        if (studentsPlaySound) {
            socket.to(roomID).emit(Events.PLAY_SOUND, questionSound);
        }
        answerTimer = performance.now();
        debug('Question set!');
    }
}

function getButtons(room, buttonOptions) {

    if (!buttonOptions) {
        return DEFAULT_VOWELS;
    }

    if (room && room.wordSearchModeEnabled) {
        return room.getWordSearchLabels();
    }

    let vowelLabels = buttonOptions.vowelLabels;
    let buttons = [];

    for (let i = 0; i < vowelLabels.length; i++) {
        let vowel = vowelLabels[i];
        buttons.push(new Button(vowel.sound, vowel.label));
    }

    if (buttonOptions.randomizeVowelPositions) {
        Util.shuffle(buttons);
    }

    return buttons;
}


function processStudentResponseRWRT(socket, roomID, studentResponse) {
    if (questionActive) {

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


        if (isCorrect && isIndividualMode ||
            isCorrect && (isAllForOneMode && room.afoType === GroupModule.AFO_TYPE_SCORE && Util.getLen(groupsAnswered) === room.groupCount) ||
            isCorrect && (isAllForOneMode && room.afoType === GroupModule.AFO_TYPE_SPEED) ||
            !failed && isFreeForAllMode && individualCounter === room.playerCount) {
            resetTrackingVariables();
        }

        if (failed) {
            debug('Question failed! Resetting...');
            resetTrackingVariables();
            let groups = (!isAllForOneMode) ?
                room.groups : room.groups.sort((a,b) => b.points - a.points);
            TemplateManager.emitWithTemplate(
                roomID,
                'partials/leaderboard_content',
                {
                    players: room.players.sort((a,b) => b.points - a.points),
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
        player.addPoints(answerTimer, performance.now());
        TemplateManager.emitWithTemplate(
            room.id,
            'partials/leaderboard_content',
            {
                players: room.players.sort((a,b) => b.points - a.points),
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

        groupsAnswered[group.id] = player.name;
        let responseCount = Util.getLen(groupsAnswered);

        if (isCorrect) {
            group.addPoints(answerTimer, performance.now());
            if (room.afoType === GroupModule.AFO_TYPE_SPEED ||
                (room.afoType === GroupModule.AFO_TYPE_SCORE && responseCount === room.groupCount)
            ) {
                TemplateManager.emitWithTemplate(
                    room.id,
                    'partials/leaderboard_content',
                    {players: room.players.sort((a,b) => b.points - a.points),
                        roomType: room.type,
                        groupType: room.groupType,
                        groups: room.groups.sort((a,b) => b.points - a.points)
                    },
                    Events.QUESTION_FINISHED,
                    currentQuestionTmp,
                    player.points
                );
                debug('Question answered and finished!');
            }

            return false;

        } else {
            return Util.getLen(groupsAnswered) === room.groupCount;
        }
}

function processFreeForAllResponse(room, player, currentQuestionTmp, isCorrect) {
    let group = room.findGroupByPlayer(player);

    if (isCorrect) {
        player.addPoints(answerTimer, performance.now());

        if (!ffaWinners.hasOwnProperty(group.id)) {
            // Make note of the fastest player to answer correctly for each group
            ffaWinners[group.id] = player.name;
        }
    }

    if (individualCounter === room.playerCount) {
        if (Util.getLen(ffaWinners) === 0) {
            return true;
        } else {
            resetTrackingVariables();

            TemplateManager.emitWithTemplate(
                room.id,
                'partials/leaderboard_content',
                {players: room.players.sort((a,b) => b.points - a.points),
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
        resetTrackingVariables();
        TemplateManager.emitWithTemplate(
            roomID,
            'partials/leaderboard_content',
            {
                players: room.players.sort((a,b) => b.points - a.points),
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

function addWordToList(socket, roomID, listKey, item) {
    let room = RoomList.getRoomByID(roomID);
    let player = PlayerList.getPlayerBySocketID(socket.id);
    if (room && player.isTeacher) {
        room.addWord(listKey, item);
    }
}

function removeWordFromList(socket, roomID, listKey, item) {
    let room = RoomList.getRoomByID(roomID);
    let player = PlayerList.getPlayerBySocketID(socket.id);
    if (room && player.isTeacher) {
        room.removeWord(listKey, item);
    }
}

function clearWordLists(socket, roomID) {
    let room = RoomList.getRoomByID(roomID);
    let player = PlayerList.getPlayerBySocketID(socket.id);
    if (room && player.isTeacher) {
        for (let k in room.wordLists) {
            room.wordLists[k] = [];
        }
    }
}

function toggleWordSearchMode(socket, roomID, enabled) {
    let room = RoomList.getRoomByID(roomID);
    let player = PlayerList.getPlayerBySocketID(socket.id);
    if (room && player.isTeacher) {
        room.wordSearchModeEnabled = enabled;
    }
}

function sendLeaderboard(socket, roomID) {
    let room = RoomList.getRoomByID(roomID);
    if (room) {
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
}


function endGame(socket, roomID) {
    let room = RoomList.getRoomByID(roomID);
    let contexts = [];
    let podiumList;

    if (room) {

        let sockets = room.players.map((x)=> x.id);
        podiumList = room.getRankings();

        if (podiumList.length !== 0) {
            if (room.groupType === GroupTypes.TYPE_FREE_FOR_ALL) {
                contexts = sockets.map(function (x) {
                    let player = PlayerList.getPlayerBySocketID(x);
                    let group = player.getGroups()[roomID];
                    let ranking = podiumList[group.id].find((y) => y.id === player.id || y.id === group.id)?.ranking;
                    return {ranking: ranking};
                }, this);

            } else {
                contexts = sockets.map(function (x) {
                    let player = PlayerList.getPlayerBySocketID(x);
                    let group = player.getGroups()[roomID];
                    let ranking = podiumList.find((y) => y.id === player.id || y.id === group?.id)?.ranking;
                    return {ranking: ranking};
                });
            }

            TemplateManager.emitWithIndividualizedTemplate(sockets, 'partials/game_over_students',
                contexts, Events.GAME_OVER_STUDENT);
        }

        TemplateManager.emitWithTemplate(socket.id, 'partials/game_over_teacher',
            {
                podiumList: podiumList,
                roomType: room.type,
                groupType: room.groupType
            }, Events.GAME_OVER);

        room.resetScores();
    }
}

module.exports = {
    setQuestion: setQuestion,
    processStudentResponse: processStudentResponseRWRT,
    skipQuestion: skipQuestion,
    playSound: playSound,
    addWordToList: addWordToList,
    removeWordFromList: removeWordFromList,
    clearWordLists: clearWordLists,
    toggleWordSearchMode: toggleWordSearchMode,
    sendLeaderboard: sendLeaderboard,
    endGame: endGame,
    DEFAULT_VOWELS: DEFAULT_VOWELS,
    VOWEL_LABELS: VOWEL_LABELS
};