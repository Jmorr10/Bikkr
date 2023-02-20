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
 * Adds listeners for game-related events to the socket connection
 *
 * @author Joseph Morris <JRM.Softworks@gmail.com>
 * @version 1.0
 * @since 1.0
 */

/** @module game_events **/

const Events = require('./event_types');
const GameManager = require('./game_manager');

/**
 * Adds listeners to the socket
 *
 * @param socket The socket connection to listen on.
 */
function addSocketListeners (socket) {

    socket.on(Events.SET_QUESTION, GameManager.setQuestion.bind(null, socket));
    socket.on(Events.STUDENT_RESPONSE, GameManager.processStudentResponse.bind(null, socket));
    socket.on(Events.SKIP_QUESTION, GameManager.skipQuestion.bind(null, socket));
    socket.on(Events.PLAY_SOUND, GameManager.playSound.bind(null, socket));
    socket.on(Events.ADD_WORD_TO_LIST, GameManager.addWordToList.bind(null, socket));
    socket.on(Events.REMOVE_WORD_FROM_LIST, GameManager.removeWordFromList.bind(null, socket));
    socket.on(Events.CLEAR_WORD_LISTS, GameManager.clearWordLists.bind(null, socket));
    socket.on(Events.TOGGLE_WORD_SEARCH_MODE, GameManager.toggleWordSearchMode.bind(null, socket));
    socket.on(Events.UPDATE_LEADERBOARD, GameManager.sendLeaderboard.bind(null, socket));
    socket.on(Events.CHANGE_GAME_MODE, GameManager.changeGameMode.bind(null, socket));
    socket.on(Events.GET_TIMER, GameManager.getTimer.bind(null, socket));
    socket.on(Events.FORCE_QUESTION_FINISHED, GameManager.forceQuestionFinished.bind(null, socket));
    socket.on(Events.END_GAME, GameManager.endGame.bind(null, socket));

}

module.exports = addSocketListeners;