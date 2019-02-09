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

/** @module app/view_sound_grid**/

/**
 * This module handles user interactions on the sound grid.
 *
 * @author Joseph Morris <JRM.Softworks@gmail.com>
 * @version 1.0
 * @since 1.0
 */
define(['jquery', 'app/player', 'app/render_manager', 'event_types'],
	function (jQ, Player, render_manager, Events) {

	const socket = Player.getConnection();
	let player;

	let startBtn;
	let soundGridHolder;
	let errorLbl;
	let roomID;
	let currentQuestion = "";
	let modalBlack;
	let studentsPlaySound = false;
	let disableMainSound = false;

	function start() {

		player = Player.getPlayer();
        startBtn = jQ('#startBtn');
        soundGridHolder = jQ('#soundGridHolder');
        errorLbl = jQ('.error-lbl');
        roomID = jQ('#roomIDVal').val();
        modalBlack = jQ('.modal-black');

        startBtn.click(function () {
            soundGridHolder.removeClass('locked');
            startBtn.attr('disabled', true).hide();
        });

        soundGridHolder.find('button').click(function (e) {
        	e.stopImmediatePropagation();
        	setQuestion(jQ(this).attr('data-sound'));
		});

        jQ('#playerListBtn').click(function () {
        	jQ('#playerList').addClass('open');
		});

        jQ('#closePlayerListBtn').click(function () {
        	jQ('#playerList').removeClass('open');
		});

        jQ('#leaderboardBtn').click(function () {
        	jQ('#leaderboard').addClass('open');
		});

        jQ('#closeLeaderboardBtn').click(function () {
        	jQ('#leaderboard').removeClass('open');
		});

        jQ('#skipBtn').click(function () {
        	if (currentQuestion && currentQuestion !== "") {
                socket.emit(Events.SKIP_QUESTION, roomID, currentQuestion);
                currentQuestion = "";
			}
		});

        jQ('#replayBtn').click(function () {
        	if (currentQuestion && currentQuestion !== "") {
                playSound(currentQuestion);
			}
		});

        jQ('#settingsBtn').click(function () {
            jQ('#settings').addClass('open');
		});

        jQ('#closeSettingsBtn').click(function () {
            jQ('#settings').removeClass('open');
        });

        modalBlack.click(function () {
            jQ(this).parent().removeClass('open');
        });

        jQ('body').keypress(function (e) {
            if (e.keyCode === 27) {
                modalBlack.parent().removeClass('open');
            }
        });

		socket.on(Events.QUESTION_FINISHED, updateState);
		socket.on(Events.QUESTION_FAILED, questionFailed);
	}


	function setQuestion (questionSound) {
		soundGridHolder.addClass('locked');
		currentQuestion = questionSound;
        if (disableMainSound) {
            socket.emit(Events.SET_QUESTION, roomID, questionSound, studentsPlaySound);
		} else {
            let sound = new Audio(`/static/audio/${questionSound}.mp3`);
            jQ(sound).bind('ended', function () {
                socket.emit(Events.SET_QUESTION, roomID, questionSound, studentsPlaySound);
            });
            sound.play();
		}
	}

	function playSound(questionSound) {
		if (!disableMainSound) {
            let sound = new Audio(`/static/audio/${questionSound}.mp3`);
            sound.play();
		}

		if (studentsPlaySound) {
         	socket.emit(Events.PLAY_SOUND, roomID, questionSound);
		}
    }

	function kickPlayer(playerID) {
		if (socket) {
            socket.emit(Events.KICK_PLAYER, playerID);
		}
	}

	function updateState(template) {
		currentQuestion = "";
		soundGridHolder.removeClass('locked');
		render_manager.renderResponse(template);
	}

	function questionFailed(template) {
		updateState(template);
		alert('Lol... failed.');
	}

	function setError (errorTxt) {
		errorLbl.text(errorTxt);
	}

	function setStudentsPlaySound(val) {
		studentsPlaySound = val;
	}

	function setDisableMainSound(val) {
		disableMainSound = val;
	}


	return {
		start: start,
		kickPlayer: kickPlayer,
		setStudentsPlaySound: setStudentsPlaySound,
		setDisableMainSound: setDisableMainSound
	};
	
});