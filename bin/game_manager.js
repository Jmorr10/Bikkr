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
    TYPE_ONE_FOR_ALL: GroupModule.TYPE_ONE_FOR_ALL,
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
    {sound: "SHORT_A", label:"/æ/"},
    {sound: "LONG_A", label:"/eɪ/"},
    {sound: "SHORT_E", label:"/ɛ/"},
    {sound: "LONG_E", label:"/i/"},
    {sound: "SHORT_I", label:"/I/"},
    {sound: "LONG_I", label:"/aɪ/"},
    {sound: "SHORT_O", label:"/ɑ/"},
    {sound: "LONG_O", label:"/oʊ/"},
    {sound: "SHORT_U", label:"/ʊ/"},
    {sound: "LONG_U", label:"/u/"}
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


// FIXME: ALL OF THIS INFORMATION NEEDS TO BE STORED ON THE ROOM. OTHERWISE, THE SERVER CAN
// ONLY HANDLE ONE GAME ROOM AT A TIME. DUHHHHHHHHH...

class Button {
    constructor(sound, label) {
        this.sound = sound;
        this.label = label;
    }
}

function setQuestion(socket, roomID, questionSound, buttonOptions, studentsPlaySound) {
    let player = PlayerList.getPlayerBySocketID(socket.id);
    if (SOUNDS.hasOwnProperty(questionSound) && player.isTeacher) {
        let room = RoomList.getRoomByID(roomID);
        if (!room) {
            return;
        }
        room.currentQuestion = questionSound;
        // Setting an expected answer count prevents problems from occurring if a player joins the room after the question is set.
        room.expectedAnswerCount =  _getExpectedAnswerCount(room);
        room.questionActive = true;
        let buttons = getButtons(room, buttonOptions);
        if (room.wordSearchModeEnabled) {
            room.currentWSQuestion = buttons.filter((x) => x.sound === questionSound)[0].label || "";
        }
        TemplateManager.sendPrecompiledTemplate(roomID, 'partials/vowel_grid',
            {locked: false, buttons: buttons});
        let io = ConnectionManager.getIO();
        io.in(roomID).emit(Events.QUESTION_READY);
        if (studentsPlaySound) {
            socket.to(roomID).emit(Events.PLAY_SOUND, questionSound);
        }
        room.answerTimer = performance.now();

        let answersNeeded = (
            (room.type === RoomModule.TYPE_INDIVIDUAL && room.individualType === RoomModule.INDIVIDUAL_MODE_SPEED_BASED) ||
            (room.type === RoomModule.TYPE_GROUP &&
            room.groupType === GroupTypes.TYPE_ONE_FOR_ALL &&
            room.ofaType === GroupModule.OFA_TYPE_SPEED)) ? 1 : room.expectedAnswerCount;

        // Send in the following modes: INDIVIDUAL - SCORE, GROUP - FFA, GROUP - OFA - SCORE
        if (room.type === RoomModule.TYPE_INDIVIDUAL && room.individualType === RoomModule.INDIVIDUAL_MODE_SCORE_BASED ||
            (room.type === RoomModule.TYPE_GROUP &&
            (room.groupType === GroupTypes.TYPE_FREE_FOR_ALL ||
                (room.groupType === GroupTypes.TYPE_ONE_FOR_ALL && room.ofaType === GroupModule.OFA_TYPE_SCORE))))
        {
            TemplateManager.sendPrecompiledTemplate(socket.id, 'partials/answer_counter',
                { answers_needed: answersNeeded });
        }


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
    let room = RoomList.getRoomByID(roomID);
    if (room && room.questionActive && room.playersAnswered.indexOf(socket.id) === -1) {

        room.playersAnswered.push(socket.id);

        let player = PlayerList.getPlayerBySocketID(socket.id);
        let isCorrect = studentResponse === room.currentQuestion;
        let isIndividualMode = room.type === RoomTypes.TYPE_INDIVIDUAL;
        let isOneForAllMode = room.type === RoomTypes.TYPE_GROUP && room.groupType === GroupTypes.TYPE_ONE_FOR_ALL;
        let currentQuestionTmp = room.currentQuestion;
        let failed = false;
        let finished = false;

        room.individualCounter++;

        if (!player || !room) {
            debug('PLAYER/ROOM NOT FOUND - processStudentResponse');
            return;
        }

        if (isIndividualMode) {
            [failed, finished] = processIndividualResponse(room, player, currentQuestionTmp, isCorrect);
        } else if (isOneForAllMode) {
            [failed, finished] = processOneForAllResponse(room, player, currentQuestionTmp, studentResponse, isCorrect);

        } else {
            [failed, finished] = processFreeForAllResponse(room, player, currentQuestionTmp, isCorrect);
        }

        if (failed) {
            debug('Question failed! Resetting...');
            let groups = (!isOneForAllMode) ?
                room.groups : room.groups.sort((a,b) => b.points - a.points);
            TemplateManager.emitWithTemplate(
                roomID,
                'partials/leaderboard_content',
                room.lastLeaderboard,
                Events.QUESTION_FAILED,
                currentQuestionTmp,
                (room.wordSearchModeEnabled) ? room.currentWSQuestion : ""
            );
            room.resetTrackingVariables();
        }

        if (!failed && finished) {
            room.resetTrackingVariables();
        }
    }
}

function processIndividualResponse(room, player, currentQuestionTmp, isCorrect) {

    let answersNeeded = (!isCorrect && room.individualType === RoomModule.INDIVIDUAL_MODE_SPEED_BASED) ?
        1 : room.expectedAnswerCount - room.individualCounter;

    if (room.individualType !== RoomModule.INDIVIDUAL_MODE_SPEED_BASED) {
        TemplateManager.sendPrecompiledTemplate(room.id, 'partials/answer_counter',
            {answers_needed: answersNeeded }
        );
    }

    if (isCorrect) {
        if (!room.fastestIndividual) {
            room.fastestIndividual = player;
        }
        player.addPoints(room.answerTimer, performance.now());
        if (room.individualType === RoomModule.INDIVIDUAL_MODE_SPEED_BASED) {
            return finish();
        }
    }

    if (room.individualType === RoomModule.INDIVIDUAL_MODE_SPEED_BASED) {
        return [room.individualCounter === room.expectedAnswerCount, room.individualCounter === room.expectedAnswerCount];
    }

    if (room.individualType === RoomModule.INDIVIDUAL_MODE_SCORE_BASED) {
       if (room.individualCounter === room.expectedAnswerCount) {
           if (room.fastestIndividual) {
               return finish();
           } else {
               // No one answered correctly and all players have answered.
               return [true, true];
           }
       }

       return [false, false];
    }

    function finish () {

        room.lastLeaderboard = {
            players: room.players.sort((a,b) => b.points - a.points),
            roomType: room.type,
            groupType: room.groupType,
            winner: room.fastestIndividual
        };

        TemplateManager.emitWithTemplate(
            room.id,
            'partials/leaderboard_content',
            room.lastLeaderboard,
            Events.QUESTION_FINISHED,
            currentQuestionTmp,
            room.playerScores,
            (room.wordSearchModeEnabled) ? room.currentWSQuestion : ""
        );
        debug('Question answered and finished!');
        return [false, true];
    }

}

function processOneForAllResponse(room, player, currentQuestionTmp, studentResponse, isCorrect) {
    let group = room.findGroupByPlayer(player);

    // Each group can only have one response for One-for-All mode
    if (room.groupsAnswered.hasOwnProperty(group.id)) {
        TemplateManager.emitWithTemplate(
            //`${group.id}@${room.id}`, --> sends to the entire group. But let's encourage individual participation!
            player.socket.id,
            'partials/player_already_answered',
            {player: room.groupsAnswered[group.id],
                myAnswer: studentResponse, correctAnswer: currentQuestionTmp},
            Events.QUESTION_ALREADY_ANSWERED,
            room.groupsAnswered[group.id]
        );
        // [failed?, finished?]
        return [false, false];
    }

    room.groupsAnswered[group.id] = player.name;
    let responseCount = Util.getLen(room.groupsAnswered);

    let answersNeeded = (room.ofaType === GroupModule.OFA_TYPE_SPEED) ? 1 :  room.groupCount - responseCount;

    if (room.ofaType !== GroupModule.OFA_TYPE_SPEED) {
        TemplateManager.sendPrecompiledTemplate(room.id, 'partials/answer_counter',
            { answers_needed: answersNeeded }
        );
    }

    if (isCorrect) {
        if (!room.fastestIndividual) {
            room.fastestIndividual = group;
        }

        //let baseScore = (Util.getLen(groupScores) > 0) ?
        //    Object.values(groupScores).reduce((a, b) => a > b ? a : b) : null;
        room.groupScores[group.id] =  group.points + group.addPoints(room.answerTimer, performance.now());
        if (room.ofaType === GroupModule.OFA_TYPE_SPEED ||
            (room.ofaType === GroupModule.OFA_TYPE_SCORE && responseCount === room.groupCount))
        {
            return finish();
        }

        return [false, false];

    } else if (room.ofaType === GroupModule.OFA_TYPE_SPEED) {
        // The first correct answer will end the question. If the response count is the number of groups, that
        // means no one answered the question correctly.
        return [responseCount === room.groupCount, responseCount === room.groupCount];
    } else if (room.ofaType === GroupModule.OFA_TYPE_SCORE && responseCount === room.groupCount) {
        if (Object.keys(room.groupScores).length === 0) {
            // The question is finished, but no one group answered correctly. So... failed.
            return [true, true];
        } else {
            return finish();
        }
    }

    function finish() {

        room.lastLeaderboard = {
            players: room.players.sort((a,b) => b.points - a.points),
            roomType: room.type,
            groupType: room.groupType,
            winner: room.fastestIndividual,
            groups: room.groups.sort((a,b) => b.points - a.points)
        };

        TemplateManager.emitWithTemplate(
            room.id,
            'partials/leaderboard_content',
            room.lastLeaderboard,
            Events.QUESTION_FINISHED,
            currentQuestionTmp,
            room.groupScores,
            (room.wordSearchModeEnabled) ? room.currentWSQuestion : ""
        );
        debug('Question answered and finished!');
        return [false, true];
    }

    return [false, false];
}

function processFreeForAllResponse(room, player, currentQuestionTmp, isCorrect) {
    let group = room.findGroupByPlayer(player);

    TemplateManager.sendPrecompiledTemplate(room.id, 'partials/answer_counter',
        { answers_needed: (room.expectedAnswerCount - room.individualCounter) });

    if (isCorrect) {
        let base = room.ffaWinners.hasOwnProperty(group.id) ? room.ffaWinners[group.id].points : null;
        let pointsAdded = player.addPoints(room.answerTimer, performance.now(), base);
        if (!room.ffaWinners.hasOwnProperty(group.id)) {
            // Make note of the fastest player to answer correctly for each group
            room.ffaWinners[group.id] = {'name': player.name, 'points': pointsAdded};
        }
    }

    if (room.individualCounter === room.expectedAnswerCount) {
        if (Util.getLen(room.ffaWinners) === 0) {
            // Everyone has answered and no one answered correctly.
            return [true, true];
        } else {

            room.lastLeaderboard = {
                players: room.players.sort((a,b) => b.points - a.points),
                roomType: room.type,
                groupType: room.groupType,
                groups: room.groups,
                winners: room.ffaWinners
            };

            TemplateManager.emitWithTemplate(
                room.id,
                'partials/leaderboard_content',
                room.lastLeaderboard,
                Events.QUESTION_FINISHED,
                currentQuestionTmp,
                room.playerScores,
                (room.wordSearchModeEnabled) ? room.currentWSQuestion : ""
            );

            debug('Question answered and finished!');
            return [false, true];
        }
    }

    return [false, false];
}


function skipQuestion(socket, roomID, correctAnswer) {
    let room = RoomList.getRoomByID(roomID);
    if (room) {
        debug('Question skipped! Resetting...');
        room.resetTrackingVariables();
        TemplateManager.emitWithTemplate(
            roomID,
            'partials/leaderboard_content',
            room.lastLeaderboard,
            Events.QUESTION_FAILED,
            correctAnswer,
            (room.wordSearchModeEnabled) ? room.currentWSQuestion : ""
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
            if (room.wordLists.hasOwnProperty(k)) {
                room.wordLists[k] = [];
            }
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

/*
 * This function will change between speed/score based modes for Individual and OFA games.
 * When this function is called, player's scores are reset.
 */
function changeGameMode(socket, roomID, gameMode) {
    let resetNeeded = false;
    let room = RoomList.getRoomByID(roomID);
    let player = PlayerList.getPlayerBySocketID(socket.id);
    if (room && player?.isTeacher) {
        if (room.type === RoomTypes.TYPE_INDIVIDUAL) {
            if (gameMode === RoomModule.INDIVIDUAL_MODE_SPEED_BASED || gameMode === RoomModule.INDIVIDUAL_MODE_SCORE_BASED) {
                room.individualType = gameMode;
                resetNeeded = true;
            }
        } else if (room.type === RoomTypes.TYPE_GROUP && room.groupType === GroupTypes.TYPE_ONE_FOR_ALL) {
            if (gameMode === GroupModule.OFA_TYPE_SPEED || gameMode === GroupModule.OFA_TYPE_SCORE) {
                room.ofaType = gameMode;
                resetNeeded = true;
            }
        }
        if (resetNeeded) {
            room.resetScores();
            room.lastModeChangeDatetime = performance.now();
            sendLeaderboard(socket, roomID);
            socket.emit(Events.GAME_MODE_CHANGED);
        }
    }
}

function sendLeaderboard(socket, roomID) {
    let room = RoomList.getRoomByID(roomID);
    if (room) {
        TemplateManager.sendPrecompiledTemplate(
            room.id,
            'partials/leaderboard_content',
            room.lastLeaderboard
        );
    }
}

function getTimer(socket, roomID,length) {
    length = Number(length);
    let player = PlayerList.getPlayerBySocketID(socket.id);
    let room = RoomList.getRoomByID(roomID);
    if (!isNaN(length) && player && player.isTeacher && room) {

        room.timerEnabled = (length !== 0);
        room.timerLength = length;

        TemplateManager.handlebars.render(TemplateManager.getTemplatePath('partials/timer_sass'), {timerLength: length})
            .then(function (data) {
                let disabled = (length === 0);
                TemplateManager.emitWithTemplate(room.id, 'partials/timer', {sassString: data, disabled:disabled}, Events.RENDERED_TIMER);
            })
            .catch(function (err) {
                console.log(err);
            });
    }
}

function forceQuestionFinished(socket, roomID) {
    let room = RoomList.getRoomByID(roomID);
    let caller = PlayerList.getPlayerBySocketID(socket.id);
    if (room && caller && caller.isTeacher) {
        let answersNeeded = room.missingResponses;
        if (answersNeeded) {
            answersNeeded.forEach(function (player) {
                processStudentResponseRWRT(player.socket, roomID, "");
            });
        }
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

function _getExpectedAnswerCount(room) {

    let isOneForAll = room.type === RoomTypes.TYPE_GROUP && room.groupType === GroupModule.TYPE_ONE_FOR_ALL;

    if (isOneForAll && room.ofaType === GroupModule.OFA_TYPE_SPEED )
    {
        return 1;
    } else if (isOneForAll && room.ofaType === GroupModule.OFA_TYPE_SCORE)
    {
        return room.groupCount;
    } else {
        return room.playerCount;
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
    changeGameMode: changeGameMode,
    sendLeaderboard: sendLeaderboard,
    getTimer: getTimer,
    forceQuestionFinished: forceQuestionFinished,
    endGame: endGame,
    DEFAULT_VOWELS: DEFAULT_VOWELS,
    VOWEL_LABELS: VOWEL_LABELS
};