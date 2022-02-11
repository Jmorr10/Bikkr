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
define(['jquery', 'app/player', 'app/render_manager', 'event_types'],
    function (jQ, Player, render_manager, Events) {

        const socket = Player.getConnection();
        let player;

        let soundGridHolder;
        let leaderboardBtn;
        let leaderboard;
        let closeLeaderboardBtn;
        let modalBlack;
        let popup;
        let closePopupBtn;
        let errorLbl;
        let roomID;
        let myAnswer = "";


        function start() {

            player  = Player.getPlayer();
            soundGridHolder = jQ('#S_soundGridHolder');
            leaderboardBtn = jQ('#leaderboardBtn');
            leaderboard = jQ('#leaderboard');
            closeLeaderboardBtn = jQ('#closeLeaderboardBtn');
            popup = jQ('#popupContent');
            closePopupBtn = jQ('#closePopupBtn');
            modalBlack = jQ('.modal-black');
            errorLbl = jQ('.error-lbl');
            roomID = jQ('#roomIDVal').val();

           addButtonListeners();

            leaderboardBtn.click(function () {
                leaderboard.addClass('open');
            });

            closeLeaderboardBtn.click(function () {
                leaderboard.removeClass('open');
            });

            closePopupBtn.click(function () {
                popup.removeClass('open');
            });

            modalBlack.click(function () {
                jQ(this).parent().removeClass('open');
            });

            jQ('body').keypress(function (e) {
                if (e.keyCode === 27) {
                    modalBlack.parent().removeClass('open');
                }
            });

            socket.on(Events.QUESTION_READY, unlockSoundGrid);
            socket.on(Events.QUESTION_FINISHED, processResults);
            socket.on(Events.QUESTION_ALREADY_ANSWERED, alreadyAnswered);
            socket.on(Events.QUESTION_FAILED, questionFailed);
            socket.on(Events.PLAY_SOUND, playSound);
            socket.on(Events.GAME_OVER_STUDENT, gameOver);
        }

        function addButtonListeners() {
            soundGridHolder.find('button').click(function (e) {
                e.stopImmediatePropagation();
                soundGridHolder.addClass('locked');
                sendAnswer(jQ(this).attr('data-sound'));
            });
        }

        function unlockSoundGrid () {
            soundGridHolder.removeClass('locked');
        }

        function processResults(template, correctAnswer, points) {

            render_manager.renderResponse(template);
            player.points = points;
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

        function alreadyAnswered(template, playerName, correctAnswer) {
            if (player.name !== playerName) {
                render_manager.renderResponse(template);
                soundGridHolder.addClass('locked');
                popup.addClass('open');
                setTimeout(function () {
                    popup.removeClass('open');
                }, 2000);
            }
        }

        function sendAnswer(answer) {
            myAnswer = answer;
            socket.emit(Events.STUDENT_RESPONSE, roomID, answer);
        }

        function questionFailed(template, correctAnswer) {
            // TODO: Play class-failure animation here
            processResults(template, correctAnswer);
        }

        function playSound(questionSound) {
            Player.getSoundElement().src = `/static/audio/${questionSound}.mp3`;
        }

        function gameOver(template) {
            soundGridHolder.addClass('locked');
            render_manager.renderResponse(template);
        }

        return {
            start: start
        };

    });