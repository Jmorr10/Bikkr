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
 * Provides a convenient enum of the various types of socket events.
 *
 * @author Joseph Morris <JRM.Softworks@gmail.com>
 * @version 1.0
 * @since 1.0
 */

/** @module event_types **/

// General - Socket.IO specific
const CONNECTION = 'connection';
const SOCKET_CONNECTED = 'connect';
const DISCONNECT = 'disconnect';
const LOGIN_SUCCESS = "login_success";

const CLIENT_CONNECTED = 'client_connected';
const HEARTBEAT = 'heartbeat';
const NEW_ROOM = 'new_room';
const JOIN_ROOM = 'join_room';

// WARNING: This event is only fired when students must manually enter their username
const ROOM_JOINED = "room_joined";

const ROOM_SETUP = "room_setup";
const ROOM_SET_UP = "room_set_up";
const JOIN_GROUP = "join_group";
const GROUP_JOINED = "group_joined";
const SET_USERNAME = 'set_username';
const USERNAME_OK = 'username_ok';
const SET_QUESTION = 'set_question';
const QUESTION_READY = "question_ready";
const QUESTION_FINISHED = "question_finished";
const QUESTION_FAILED = "question_failed";
const QUESTION_ALREADY_ANSWERED = "question_already_answered";
const SKIP_QUESTION = "skip_question";
const STUDENT_RESPONSE = 'student_response';
const KICK_PLAYER = 'kick_player';
const KICKED = "kicked";
const HOST_DISCONNECTED = 'host_disconnected';
const CONNECT_AGAIN = "connect_again";
const PLAY_SOUND = 'play_sound';
const END_GAME = 'end_game';
const GAME_OVER = 'game_over';
const GAME_OVER_STUDENT = 'game_over_student';
const ADD_WORD_TO_LIST = "add_word";
const REMOVE_WORD_FROM_LIST = "remove_word";
const CLEAR_WORD_LISTS = "clear_lists";
const TOGGLE_WORD_SEARCH_MODE = "toggle_word_search";
const CHANGE_GAME_MODE = "change_game_mode";
const GAME_MODE_CHANGED = "game_mode_changed";
const UPDATE_LEADERBOARD = "update_leaderboard";

// GUI
const RENDER_TEMPLATE = "render_template";

const DEBUG = "debug";

module.exports = {
    CONNECTION: CONNECTION,
    SOCKET_CONNECTED: SOCKET_CONNECTED,
    DISCONNECT: DISCONNECT,
    LOGIN_SUCCESS: LOGIN_SUCCESS,
    CLIENT_CONNECTED: CLIENT_CONNECTED,
    HEARTBEAT: HEARTBEAT,
    NEW_ROOM: NEW_ROOM,
    JOIN_ROOM: JOIN_ROOM,
    ROOM_JOINED: ROOM_JOINED,
    ROOM_SETUP: ROOM_SETUP,
    ROOM_SET_UP: ROOM_SET_UP,
    JOIN_GROUP: JOIN_GROUP,
    GROUP_JOINED: GROUP_JOINED,
    SET_USERNAME: SET_USERNAME,
    USERNAME_OK: USERNAME_OK,
    SET_QUESTION: SET_QUESTION,
    QUESTION_READY: QUESTION_READY,
    QUESTION_FINISHED: QUESTION_FINISHED,
    QUESTION_FAILED: QUESTION_FAILED,
    QUESTION_ALREADY_ANSWERED: QUESTION_ALREADY_ANSWERED,
    SKIP_QUESTION: SKIP_QUESTION,
    STUDENT_RESPONSE: STUDENT_RESPONSE,
    KICK_PLAYER: KICK_PLAYER,
    KICKED: KICKED,
    HOST_DISCONNECTED: HOST_DISCONNECTED,
    CONNECT_AGAIN: CONNECT_AGAIN,
    PLAY_SOUND: PLAY_SOUND,
    END_GAME: END_GAME,
    GAME_OVER: GAME_OVER,
    GAME_OVER_STUDENT: GAME_OVER_STUDENT,
    ADD_WORD_TO_LIST: ADD_WORD_TO_LIST,
    REMOVE_WORD_FROM_LIST: REMOVE_WORD_FROM_LIST,
    CLEAR_WORD_LISTS: CLEAR_WORD_LISTS,
    TOGGLE_WORD_SEARCH_MODE: TOGGLE_WORD_SEARCH_MODE,
    CHANGE_GAME_MODE: CHANGE_GAME_MODE,
    GAME_MODE_CHANGED: GAME_MODE_CHANGED,
    UPDATE_LEADERBOARD: UPDATE_LEADERBOARD,
    RENDER_TEMPLATE: RENDER_TEMPLATE
};