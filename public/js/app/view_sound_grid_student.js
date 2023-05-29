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

/** @module app/view_sound_grid_student**/

/**
 * This module handles user interactions on the student sound grid.
 *
 * @author Joseph Morris <JRM.Softworks@gmail.com>
 * @version 1.0
 * @since 1.0
 */
define(['jquery', 'app/player', 'app/render_manager', 'event_types', 'app/util', 'app/messages'],
    function (jQ, Player, render_manager, Events, Util, Messages) {

        const socket = Player.getConnection();
        let player;

        let gameRef;
        require(['app/game'], function (game) {
            gameRef = game;
        });


        let soundGridHolder;
        let leaderboardBtn;
        let leaderboard;
        let closeLeaderboardBtn;
        let modalBlack;
        let errorLbl;
        let roomID;
        let myAnswer = "";


        function start() {

            player  = Player.getPlayer();
            soundGridHolder = jQ('#S_soundGridHolder');
            leaderboardBtn = jQ('#leaderboardBtn');
            leaderboard = jQ('#leaderboard');
            closeLeaderboardBtn = jQ('#closeLeaderboardBtn');
            modalBlack = jQ('.modal-black').not('#reconnecting > .modal-black');
            errorLbl = jQ('.error-lbl');
            roomID = jQ('#roomIDVal').val();

           addButtonListeners();

            socket.on(Events.QUESTION_READY, unlockSoundGrid);
            socket.on(Events.QUESTION_FINISHED, processResults);
            socket.on(Events.QUESTION_ALREADY_ANSWERED, alreadyAnswered);
            socket.on(Events.QUESTION_FAILED, questionFailed);
            socket.on(Events.PLAY_SOUND, playSound);
            socket.on(Events.GAME_OVER_STUDENT, gameOver);
            socket.on(Events.RENDERED_TIMER, updateTimer);
        }

        function addButtonListeners() {
            soundGridHolder.find('button').click(Util.debounce(function (e) {
                e.stopImmediatePropagation();
                soundGridHolder.addClass('locked');
                sendAnswer(jQ(this).attr('data-sound'));
            }, 250, true));
        }

        function unlockSoundGrid () {
            let timer = jQ('#answerTimer');
            if (!timer.hasClass('disabled')) {
                startTimer();
            }
            soundGridHolder.removeClass('locked');
        }

        function startTimer() {
            let timer = jQ('#answerTimer');
            let timerHolder = jQ('#studentTimer');
            let headerContent = jQ('#headerContent');
            headerContent.addClass('hide');
            timerHolder.show();
            timer.one('animationend', function () {
                resetTimer();
            }).fadeIn().addClass('active');
        }

        function resetTimer() {
            let timer = jQ('#answerTimer');
            if (!timer.hasClass('disabled')) {
                let timerHolder = jQ('#studentTimer');
                let headerContent = jQ('#headerContent');
                timerHolder.hide();
                timer.removeClass('active');
                headerContent.removeClass('hide');
            }
        }

        function processResults(template, correctAnswer, points) {

            render_manager.renderResponse(template);
            // Check if group or player
            // Group = access by group ID
            // Player = filter array by name property on values
            if (points) {
                if (points.constructor === Array) {
                    points = points.filter(x => x.name === player.name);
                    points = (points.length > 0) ? points[0].points : 0;
                } else {
                    points = points[player.group]
                }
                player.points = points;
            }

            resetTimer();

            soundGridHolder.addClass('locked');

            let correctBtn = soundGridHolder.find(`button[data-sound=${correctAnswer}]`);
            let incorrectBtn;
            if (myAnswer !== "" && myAnswer !== correctAnswer) {
                incorrectBtn = soundGridHolder.find(`button[data-sound=${myAnswer}]`);
                incorrectBtn.addClass('incorrect');
                setTimeout(function () { incorrectBtn.removeClass('incorrect'); }, 2000);
            }

            myAnswer = "";

            correctBtn.addClass('correct');
            setTimeout(function () { correctBtn.removeClass('correct'); }, 2000);

        }

        function alreadyAnswered(playerName) {
            if (player.name !== playerName) {
                soundGridHolder.addClass('locked');
                gameRef.showNotification(
                    Messages.ALREADY_ANSWERED(playerName), "already_answered",
                    {type:gameRef.NOTICE_TYPES.warning}
                );
            }
        }

        function sendAnswer(answer) {
            myAnswer = answer;
            socket.emit(Events.STUDENT_RESPONSE, roomID, answer);
        }

        function questionFailed(template, correctAnswer) {
            processResults(template, correctAnswer);
        }

        function playSound(questionSound) {
            Player.getSoundElement().src = `/static/audio/${questionSound}.mp3`;
        }

        function updateTimer(template) {
            render_manager.renderResponse(template);
        }

        function gameOver(template) {
            soundGridHolder.addClass('locked');
            render_manager.renderResponse(template);
        }

        return {
            start: start
        };

    });