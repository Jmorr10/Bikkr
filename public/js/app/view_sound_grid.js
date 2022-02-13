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
	let endBtn;
	let soundGridHolder;
	let errorLbl;
	let roomID;
	let currentQuestion = "";
	let modalBlack;
	let playerCount;
	let scoreboard;
	let studentsPlaySound = false;
	let disableMainSound = false;
	let randomizeVowelLabels = false;
	let randomizeVowelPositions = false;
	let vowelLabels = {
		"SHORT_A": ["/æ/", "A"],
		"LONG_A": ["/eɪ/", "AI", "AY", "EY", "EIGH"],
		"SHORT_E": ["/ɛ/", "E"],
		"LONG_E": ["/i/", "EE", "EA", "IE"],
		"SHORT_I": ["/I/", "I"],
		"LONG_I": ["/aɪ/", "IE", "IGH"],
		"SHORT_O": ["/ɑ/", "O"],
		"LONG_O": ["/oʊ/", "OA"],
		"SHORT_U": ["/ʊ/", "U"],
		"LONG_U": ["/u/", "UE", "OO", "EW"]
	};
	let enabledVowelLabels = jQ.extend(true, {}, vowelLabels);

	function start() {

		player = Player.getPlayer();
        startBtn = jQ('#startBtn');
        endBtn = jQ('#endBtn');
        soundGridHolder = jQ('#T_soundGridHolder');
        errorLbl = jQ('.error-lbl');
        roomID = jQ('#roomIDVal').val();
        modalBlack = jQ('.modal-black');

        startBtn.click(function () {
        	if (playerCount === 0) {
        		shake(startBtn);
        		return false;
			}
            soundGridHolder.removeClass('locked');
            startBtn.attr('disabled', true).hide();
            endBtn.attr('disabled', false).show();
        });

        endBtn.click(function () {
        	soundGridHolder.addClass('locked');
        	startBtn.attr('disabled', false).show();
        	endBtn.attr('disabled', true).hide();
        	endGame();
		});

        addButtonListeners();

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
			} else {
        		shake(this);
			}
		});

        jQ('#replayBtn').click(function () {
        	if (currentQuestion && currentQuestion !== "") {
                playSound(currentQuestion);
			} else {
        		shake(this);
			}
		});

        jQ('#settingsBtn').click(function () {
            jQ('#settings').addClass('open');
		});

        jQ('.modal-close-btn').click(function () {
        	jQ(this).parents('.modal-popup').removeClass('open');
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

	function addButtonListeners() {
		soundGridHolder.find('button').click(function (e) {
			e.stopImmediatePropagation();
			setQuestion(jQ(this).attr('data-sound'));
		});
	}


	function setQuestion (questionSound) {
		soundGridHolder.addClass('locked');
		currentQuestion = questionSound;
		let vowelLabels = getVowelLabels();
		let buttonOptions = {
			randomizeVowelPositions: randomizeVowelPositions,
			vowelLabels: vowelLabels
		};
        if (disableMainSound) {
            socket.emit(Events.SET_QUESTION, roomID, questionSound, buttonOptions, studentsPlaySound);
		} else {
            let sound = new Audio(`/static/audio/${questionSound}.mp3`);
            jQ(sound).bind('ended', function () {
                socket.emit(Events.SET_QUESTION, roomID, questionSound, buttonOptions, studentsPlaySound);
            });
            sound.play();
		}
	}

	function getVowelLabels() {
		let labels = [];
        jQ.each(enabledVowelLabels, function (key, val) {
			let idx = (randomizeVowelLabels) ? Math.floor(Math.random() * val.length) : 0;
			let label = val[idx];
			if (label)
			labels.push({
				sound: key,
				label: label
			});
		});

		return labels;
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

	function openVowelLabelsSelector() {
        jQ('#vowelSelector').addClass('open');
	}

	function toggleVowelLabel(listID, itemID, enabled) {
		let vowelList = enabledVowelLabels[listID];
		if (vowelList) {
			let idx = vowelList.indexOf(itemID);
			if (idx === -1 && enabled) {
				vowelList.push(itemID);
			} else if (idx !== -1 && !enabled) {
				vowelList.splice(idx, 1);
			}

			let buttonVisible = (vowelList.length !== 0);
			jQ(`button[data-sound=${listID}`).toggle(buttonVisible);

		}
	}

	function setRandomizeVowelLabels(val) {
		randomizeVowelLabels = val;
	}

	function setRandomizeVowelPositions(val) {
		randomizeVowelPositions = val;
	}

	function endGame() {
		socket.emit(Events.END_GAME, roomID);
		socket.once(Events.GAME_OVER, gameOver);
	}

	function gameOver(template) {
		render_manager.renderResponse(template);
	}

	function updatePlayerCount(count) {
		playerCount = count;
	}

	function setScoreboard(windowRef) {
		scoreboard = windowRef;
	}

	// Courtesy of StackOverflow's @phpslightly - https://stackoverflow.com/a/17381205
	function shake(div, interval=60, distance=5, times=4){
		jQ(div).css('position','relative');
		for(let iter=0;iter<(times+1);iter++){
			jQ(div).animate({ left: ((iter%2===0 ? distance : distance*-1))}, interval);
		}//for
		jQ(div).animate({ left: 0},interval);
	}


	return {
		start: start,
		kickPlayer: kickPlayer,
		setStudentsPlaySound: setStudentsPlaySound,
		setDisableMainSound: setDisableMainSound,
		openVowelLabelsSelector: openVowelLabelsSelector,
		toggleVowelLabel: toggleVowelLabel,
        setRandomizeVowelLabels: setRandomizeVowelLabels,
		setRandomizeVowelPositions: setRandomizeVowelPositions,
		updatePlayerCount: updatePlayerCount,
		setScoreboard: setScoreboard,
		VOWEL_LABELS: vowelLabels
	};
	
});