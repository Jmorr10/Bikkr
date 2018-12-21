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
define(['jquery', 'app/socket_manager', 'app/player', 'app/render_manager', 'event_types'],
    function (jQ, socketManager, Player, render_manager, Events) {

        const socket = socketManager.getConnection();
        let player = Player.getPlayer();

        let soundGridHolder;
        let errorLbl;
        let roomID;

        function start(rID) {

            soundGridHolder = jQ('#soundGridHolder');
            errorLbl = jQ('.error-lbl');
            roomID = rID;

            soundGridHolder.find('button').click(function (e) {
                e.stopImmediatePropagation();
                soundGridHolder.addClass('locked');
                sendAnswer(jQ(this).attr('data-sound'));
            });

            socket.on(Events.QUESTION_READY, unlockSoundGrid);
            socket.on(Events.QUESTION_FINISHED, processResults);
            socket.on(Events.QUESTION_ALREADY_ANSWERED, processResults);
        }


        function unlockSoundGrid () {
            soundGridHolder.removeClass('locked');
        }

        function processResults(template) {
            render_manager.renderResponse(template);
            soundGridHolder.addClass('locked');
        }

        function sendAnswer(answer) {
            socket.emit(Events.STUDENT_RESPONSE, roomID, answer);
        }

        return {
            start: start
        };

    });