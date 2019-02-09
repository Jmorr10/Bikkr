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

/** @module app/view_group_selection**/

/**
 * This module handles user interactions on the group selection screen.
 *
 * @author Joseph Morris <JRM.Softworks@gmail.com>
 * @version 1.0
 * @since 1.0
 */
define(['jquery', 'app/player', 'app/view_sound_grid_student', 'app/render_manager', 'event_types'],
    function (jQ, Player, soundGridStudent, render_manager, Events) {

        const socket = Player.getConnection();
        let player;
        let roomID;
        let groupID;
        let errorLbl;

        function start() {

            roomID = jQ('#roomIDVal').val();
            errorLbl = jQ('.error-lbl');
            player = Player.getPlayer();

            jQ('#groupSelectionForm button').click(function (e) {
                e.stopImmediatePropagation();
                groupID = jQ(this).data('group');
                socket.emit(Events.JOIN_GROUP, roomID, groupID);
            });

            socket.on(Events.GROUP_JOINED, finish);
        }

        function setError (errorTxt) {
            errorLbl.text(errorTxt);
        }

        function finish (template, roomID) {
            render_manager.renderResponse(template);
            player.group = groupID;
            // FIXME: DELETE
            //soundGridStudent.start(roomID);
        }

        return {
            start: start
        };

    });