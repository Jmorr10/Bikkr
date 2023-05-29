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

/** @module app/player **/

/**
 * This module acts as the client-side version of the Player class.
 * @author Joseph Morris <JRM.Softworks@gmail.com>
 * @version 1.0
 * @since 1.0
 */
define([], function () {

    return function () {

        const ENGLISH = 'MESSAGES_EN';
        const JAPANESE = 'MESSAGES_JA';

        const MESSAGES_EN = {
            ERR_NO_USERNAME: "Please enter a username to begin!",
            ERR_NO_ROOMNAME: "Please enter a room name to begin!",
            ERR_CANT_CONNECT_TO_SERVER: 'Disconnected from the server.',
            RECONNECTING: "Reconnecting...",
            RECONNECTED: "Successfully reconnected!",
            LEADERBOARD: "Leaderboard",
            NO_SCORES: "No scores!",
            PLAYER_LIST: "Player List",
            NO_PLAYERS: "No players!",
            JOIN_GROUP: "Join Group",
            CHOOSE_GROUP: "Choose a group to join",
            ALREADY_ANSWERED: (x) => `${x} already answered for your group!`
        };
        const MESSAGES_JA = {
            ERR_NO_USERNAME: "ユーザー名を入力してください！",
            ERR_NO_ROOMNAME: "部屋名を入力してください！",
            ERR_CANT_CONNECT_TO_SERVER: 'サーバーから切断されました。',
            RECONNECTING: "再接続中...",
            RECONNECTED: "再接続に成功しました！",
            LEADERBOARD: "リーダーボード",
            NO_SCORES: "スコアはありません！",
            PLAYER_LIST: "プレイヤーリスト",
            NO_PLAYERS: "プレイヤーはいません！",
            JOIN_GROUP: "グループ",
            CHOOSE_GROUP: "グループを選択してください。",
            ALREADY_ANSWERED: (x) => `${x}はすでにあなたのグループのために答えてくれました！`
        };

        let keyset = {};
        Object.keys(MESSAGES_EN).map((k) => keyset[k] = k);

        function get(key, lang) {
            let messageSet = (!lang) ?
                ((/^ja\b/.test(navigator.language)) ? MESSAGES_JA : MESSAGES_EN) :
                (lang === JAPANESE) ? MESSAGES_JA : MESSAGES_EN;

            return (messageSet.hasOwnProperty(key)) ? messageSet[key] : null;
        }

        let messageSet;

        if (/^ja\b/.test(navigator.language)) {
            messageSet = MESSAGES_JA;
        } else {
            messageSet = MESSAGES_EN;
        }

        return {
            get: get,
            ENGLISH: ENGLISH,
            JAPANESE: JAPANESE,
            keys: keyset,
            ...messageSet
        }




    }();

});