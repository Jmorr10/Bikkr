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

/** @module player **/

const debug = require('debug')('BoinKikuRenshuu:player');
const Events = require('./event_types');
const TemplateManager = require('./template_manager');

/**
 * Represents a player and its state.
 *
 * @author Joseph Morris <JRM.Softworks@gmail.com>
 * @version 1.0
 * @since 1.0
 * @class
 */
class Player {

    /**
     * Creates a player instance and sets its default state.
     *
     * @param socketID The socket which the player instance will represent
     */
    constructor(socketID, isTeacher) {
        this.id = socketID;
        this.resetPlayer(true);
        this.isTeacher = (isTeacher === true);
    }

    /**
     * Sets the player state back to defaults. If full is true, then the matchID is also reset.
     *
     * @param resetMatchID Whether or not the matchID property will also be reset
     */
    resetPlayer(resetMatchID) {

        this.state = {
            id: this.id,
            name: this.name,
            points: 0
        };

    }

    set name(name) {
        this._name = name.charAt(0).toUpperCase() + name.slice(1);
        this.state.name = this._name;
    }

    get name() {
        return this._name;
    }


    /**
     * Adds a value to the points state member.
     *
     * @param val The value that will be added
     */
    addPoints(val) {
        this.state.points += val;
    }

    /**
     * Subtracts a value to the points state member.
     *
     * @param val The value that will be subtracted
     */
    subtractPoints(val) {
        this.state.points -= val;
    }

}

module.exports = Player;