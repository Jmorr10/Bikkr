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
	let playing = false;
	let playerCount;
	let scoreboard;
	let studentsPlaySound = false;
	let disableMainSound = false;
	let randomizeVowelLabels = false;
	let randomizeVowelPositions = false;
	let wordSearchModeEnabled = false;
	let vowelLabels = {
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
	let enabledVowelLabels = jQ.extend(true, {}, vowelLabels);

	function start() {

		player = Player.getPlayer();
        startBtn = jQ('#startBtn');
        endBtn = jQ('#endBtn');
        soundGridHolder = jQ('#T_soundGridHolder');
        errorLbl = jQ('.error-lbl');
        roomID = jQ('#roomIDVal').val();

        startBtn.click(function () {
        	if (playerCount === 0) {
        		shake(startBtn);
        		return false;
			}

        	socket.emit(Events.UPDATE_LEADERBOARD, roomID);

			if (scoreboard) {
				scoreboard.resetScoreboard();
			}

            soundGridHolder.removeClass('locked');
            playing = true;
            startBtn.attr('disabled', true).hide();
            endBtn.attr('disabled', false).show();
        });

        endBtn.click(function () {
        	soundGridHolder.addClass('locked');
        	playing = false;
        	startBtn.attr('disabled', false).show();
        	endBtn.attr('disabled', true).hide();
        	endGame();
		});

        addButtonListeners();

        jQ('#skipBtn').click(function () {
        	if (currentQuestion && currentQuestion !== "") {
                socket.emit(Events.SKIP_QUESTION, roomID, currentQuestion);
                currentQuestion = "";
				jQ('#answerCounter').hide();
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

		socket.on(Events.QUESTION_FINISHED, updateState);
		socket.on(Events.QUESTION_FAILED, questionFailed);
		//	socket.on(Events.QUESTION_READY, () => { jQ('#answerCounter').show(); });
	}

	function addButtonListeners() {
		soundGridHolder.find('button').click(function (e) {
			e.stopImmediatePropagation();
			let sound = jQ(this).attr('data-sound');
			if (playing) {
				setQuestion(sound);
			} else {
				playSound(sound);
			}
		});
	}


	function setQuestion (questionSound) {

		if (soundGridHolder.hasClass('locked')) {
			return;
		}

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
		jQ('#answerCounter').hide();
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

	function toggleWordSearchMode(enabled) {
		wordSearchModeEnabled = enabled;
		socket.emit(Events.TOGGLE_WORD_SEARCH_MODE, roomID, enabled);
	}

	function changeGameMode(gameMode) {
		if (gameMode) {
			socket.once(Events.GAME_MODE_CHANGED, function () {
				alert("Game mode changed successfully! Scores reset.");
			});
			socket.emit(Events.CHANGE_GAME_MODE, roomID, gameMode);
		}
	}


	function addWordListItem(listKey, item) {
		socket.emit(Events.ADD_WORD_TO_LIST, roomID, listKey, item);
		jQ(`button[data-sound=${listKey}`).toggle(true);
	}

	function deleteWordListItem(listKey, item, listCount) {
		socket.emit(Events.REMOVE_WORD_FROM_LIST, roomID, listKey, item);
		let buttonVisible = (listCount !== 0);
		jQ(`button[data-sound=${listKey}`).toggle(buttonVisible);
	}

	function saveWordLists() {
		let lists = {}
		jQ('#wordListEditor .modal-scroll-container input').each(function () {
			let el = jQ(this);
			if (el.attr('id')) {
				lists[el.attr('id')] = el.val();
			}
		});
		let saveName = prompt("Please enter a name for this save file:");
		if(saveName) {
			downloadTxt(saveName, JSON.stringify(lists));
		}
	}

	function loadWordLists(evt) {
		let btns = jQ('#saveWordListsBtn, #loadWordListsBtn');
		btns.prop('disabled', true);

		try {
			let files = evt.target.files; // FileList object

			// use the 1st file from the list
			let f = files[0];

			let reader = new FileReader();

			// Closure to capture the file information.
			reader.onload = (function(theFile) {
				return function(e) {
					let lists = JSON.parse(e.target.result);
					socket.emit(Events.CLEAR_WORD_LISTS, roomID);
					for (const [k,v] of Object.entries(lists)) {
						let tagHolder = jQ(`input[data-wl-key="${k}"]`);
						tagHolder.tagsinput('removeAll');
						tagHolder.tagsinput('input').val(v).trigger("blur");
						jQ(`button[data-sound=${k}`).toggle(v !== '');
					}
					btns.prop('disabled', false);
				};
			})(f);

			// Read in the image file as a data URL.
			reader.readAsText(f);
		} catch (e) {
			alert('An error occurred.')
			btns.prop('disabled', false);
		}
	}

	function endGame() {
		jQ('#answerCounter').hide();
		socket.emit(Events.END_GAME, roomID);
		socket.once(Events.GAME_OVER, gameOver);
	}

	function gameOver(template) {
		render_manager.renderResponse(template);
	}

	function updatePlayerCount(count) {
		playerCount = count;
		jQ('#playerListBtn').attr('data-player-count', playerCount);
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

	function downloadTxt(saveName, content) {
		if ('Blob' in window) {
			if (saveName) {
				saveName += ".txt";
				let textToWrite = content.replace(/\n/g, "\r\n");
				let textFileAsBlob = new Blob([textToWrite], { type: 'text/plain' });

				if ('msSaveOrOpenBlob' in navigator) {
					navigator.msSaveOrOpenBlob(textFileAsBlob, saveName);
				} else {
					let downloadLink = document.createElement('a');
					downloadLink.download = saveName;
					downloadLink.innerHTML = 'Download File';

					if ('webkitURL' in window) {
						// Chrome allows the link to be clicked without actually adding it to the DOM.
						downloadLink.href = window.webkitURL.createObjectURL(textFileAsBlob);
					} else {
						// Firefox requires the link to be added to the DOM before it can be clicked.
						downloadLink.href = window.URL.createObjectURL(textFileAsBlob);
						downloadLink.click(function(){
							document.body.removeChild(event.target);
						});

						downloadLink.style.display = 'none';
						document.body.appendChild(downloadLink);
					}
					downloadLink.click();
				}
			}
		} else {
			alert('Your browser does not support the HTML5 Blob.');
		}
	}

	window.getParentConnection = function () {
		return {
			socket: socket,
			VOWEL_LABELS: vowelLabels
		};
	}

	return {
		start: start,
		kickPlayer: kickPlayer,
		setStudentsPlaySound: setStudentsPlaySound,
		setDisableMainSound: setDisableMainSound,
		toggleVowelLabel: toggleVowelLabel,
        setRandomizeVowelLabels: setRandomizeVowelLabels,
		setRandomizeVowelPositions: setRandomizeVowelPositions,
		updatePlayerCount: updatePlayerCount,
		setScoreboard: setScoreboard,
		toggleWordSearchMode: toggleWordSearchMode,
		changeGameMode: changeGameMode,
		addWordListItem: addWordListItem,
		deleteWordListItem: deleteWordListItem,
		saveWordLists: saveWordLists,
		loadWordLists: loadWordLists,
		VOWEL_LABELS: vowelLabels
	};
	
});