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

/** @module room **/

const debug = require('debug')('BoinKikuRenshuu:room');
const Util = require('./util');
const TemplateManager = require('./template_manager');
const Events = require('./event_types');
const Group = require('./group');
const TYPE_GROUP = "group";
const TYPE_INDIVIDUAL = "individual";
const KEY_ASSIGN_USERNAMES = "assignUsernames";

const DEFAULT_WORD_LISTS= {
    "SHORT_A": ["man","ran","pan","can","fat","hat","rat","mat","sat","lack","sack","tack","back","rack","cap","tap","gap","answer","add","ask","bad","apple","and","task","trash","last","math","class","example","practical","handsome","angry","anxiety","national","salad","plan","expansive"],
    "LONG_A": ["mane","rain","pain","cane","fate","hate","rate","mate","lake","take","bake","rake","cape","tape","gape","late","save","wait","weight","they","eight","same","stay","base","neigh","break","brake","crazy","lady","basic","paper","table","radio","potato","tomato","came","space"],
    "SHORT_E": ["bet","set","pet","met","tell","sell","fell","well","men","bed","red","led","wed","pep","peck","beg","web","said","says","get","heavy","measure","again","against","any","many","next","better","friend","extra","effort","metal","breath","lend","bend","send","rent"],
    "LONG_E": ["beat","seat","meet","teal","seal","feel","mean","bean","bead","need","peek","see","sea","receive","these","team","teach","ability","deep","cheese","extremely","breathe","thief","steal","green","leaves","unique","me","tree","field","believe","honey","ceiling","beef","teeth","knee","peel"],
    "SHORT_I": ["bit","sit","kit","fit","lit","hid","rid","rip","dim","pin","fin","win","shin","pill","quit","wit","lick","pick","give","build","quick","system","gym","women","busy","big","still","milk","fish","trip","Italy","children","sister","fit","middle"," dinner","visit"],
    "LONG_I": ["bite","site","kite","fight","light","hide","ride","pipe","ripe","dime","time","pine","fine","dine","wine","shine","pile","quite","white","like","sky","kind","sight","lie","try","bright","lime","nine","line","price","design","wide","tired","drive","apply","night","diner"],
    "SHORT_O": ["cot","dot","got","not","rot","cop","mop","hop","rod","cod","nod","sock","father","stop","hot","modern","job","watch","common","problem","possible","hospital","top","dollar","want","car","army","farm","pocket","lock","odd","office","box","mom","fox","hog","pop"],
    "LONG_O": ["boat","coat","goat","note","wrote","cope","mope","soap","hope","road","code","toad","joke","poke","vote","home","slow","though","phone","smoke","window","woke","low","chose","moment","remote","cold","soda","told","broke","piano","goal","float","drove","total","focus","loan"],
    "SHORT_U": ["cut","cub","rub","tub","us","duck","luck","hug","run","good","childhood","push","sugar","would","book","woman","cooked","wool","wooden","butcher","understood","took","shook","hook","cookie","should","could","full","stood","umbrella","gum","drum","hum","shut","jump","nut","scrub"],
    "LONG_U": ["cute","cube","mute","tube","use","huge","super","rule","new","blue","true","suitcase","shoes","value","statue","beautiful","fool","pool","school","few","university","student","prove","avenue","soup","proof","food","broom","group","rescue","music","flute","duty","due","glue","crew","flew"]
};

/**
 * Represents a room and its state.
 *
 * @author Joseph Morris <JRM.Softworks@gmail.com>
 * @version 1.0
 * @since 1.0
 * @class
 */
class Room {

    /**
     * Creates a room instance and sets its default state.
     *
     * @param roomID The room's ID
     * @param owner {Player} The Player class-instance that owns this room
     */
    constructor(roomID, owner) {
        this.id = roomID;
        this.owner = owner;
        this.type = TYPE_INDIVIDUAL;
        this.players = [];
        this.groups = [];
        this.groupType = Group.TYPE_ALL_FOR_ONE;
        this.groupsAssigned = false;
        this.afoType = Group.AFO_TYPE_SPEED;
        this.usernamesAssigned = false;
        this.wordSearchModeEnabled = false;
        this.setUp = false;

        this.wordLists = JSON.parse(JSON.stringify(DEFAULT_WORD_LISTS));
    }

    get playerCount() {
        return this.players.length;
    }

    get groupCount() {
        return this.groups.length;
    }

    get playerScores() {
        let playerScores = [];
        this.players.forEach(function (v) {
            playerScores.push({name: v.name, points: v.points, id: v.id});
        });

        return playerScores.sort((a, b) => b.points - a.points);
    }

    addPlayer(player, isTeacher) {
        if (player.socket) {
            player.socket.join(this.id);
            if (!isTeacher) {
                this.players.push(player);
            }
        }
    }

    removePlayer(player) {
        if (player.hasOwnProperty('id')) {
            player.socket.leave(this.id);
            let idx = this.players.indexOf(player);
            if (idx !== -1) {
                this.players.splice(idx,1);
            }
        }
    }

    addGroup(group) {
        if (group.hasOwnProperty('id')) {
            if (!this.hasGroup(group)) {
                this.groups.push(group);
            }
        }
    }

    removeGroup(group) {
        if (group.hasOwnProperty('id')) {
            let groupIdx = this.getGroupIndex(group);
            if (groupIdx !== -1) {
                this.groups.splice(groupIdx, 1);
            }
        }
    }

    hasPlayer(player) {
        return player.hasOwnProperty('id') && this.players.indexOf(player) !== -1;
    }

    hasGroup(group) {
        if (group.hasOwnProperty('id')) {
           return this.getGroupIndex(group) !== -1;
        }

        return false;
    }

    hasGroupByID(groupID) {
        return this.hasGroup({"id": groupID});
    }

    getGroupIndex(group) {

        let idx = -1;

        if (group.hasOwnProperty('id')) {
            for (let i = 0; i < this.groups.length; i++) {
                if (this.groups[i].id === group.id) {
                    idx = i;
                    break;
                }
            }
        }

        return idx;
    }

    getGroupByID(groupID) {
        let group = false;
        let groupIdx = this.getGroupIndex({"id": groupID});
        if (groupIdx !== -1) {
            group = this.groups[groupIdx];
        }

        return group;
    }

    destroy() {
        TemplateManager.sendPrecompiledTemplate(this.id, 'disconnected', {});
        this.owner.socket.to(this.id).emit(Events.DISCONNECT);
    }

    findGroupByPlayer(player) {
        let noMatch = false;

        if (player && this.hasPlayer(player)) {
            for (const group of this.groups) {
                if (group.hasPlayer(player)) {
                    return group;
                }
            }
        }

        return noMatch;
    }

    assignPlayerToGroup(player, exceedBase) {

        function sortGroups (a,b) {
            if (a.playerCount === b.playerCount) {
                return a.id - b.id;
            } else {
                return a.playerCount - b.playerCount;
            }
        }


        if (exceedBase) {
            let group = [...this.groups].sort(sortGroups)[0];
            group.addPlayer(this, player);
            debug(`Added ${player.name} to ${group.id}`);
            return group;
        }

        let groupList = [...this.groups].sort(sortGroups);

        for (const group of groupList) {
            if (group.playerCount < group.baseNumber) {
                group.addPlayer(this, player);
                debug(`Added ${player.name} to ${group.id}`);
                return group;
            }
        }

        //If we reach this point, we need to make another loop to add the player to next group.
        return this.assignPlayerToGroup(player, true);
    }

    getRankings () {
        if (this.type === TYPE_INDIVIDUAL || (this.type === TYPE_GROUP && this.groupType === Group.TYPE_ALL_FOR_ONE)) {
            // Create a shallow copy using the spread operator
            let source = (this.type === TYPE_INDIVIDUAL) ? this.players : this.groups;
            let sorted = [...source].sort((a, b) => b.points - a.points);
            return this._generateRanks(sorted);

        } else {
            let ranksPerGroup = {};
            let that = this._generateRanks;
            let zeroCount = 0;
            this.groups.forEach(function (group) {
                if (group.playerScores.length === 0 || group.playerScores[0].points === 0) {
                    zeroCount++;
                }
                ranksPerGroup[group.id] = that(group.playerScores);
            });

            return (zeroCount === this.groups.length) ? [] : ranksPerGroup;
        }

    }

    _generateRanks(playersSortedByScore) {
        let ranks = [];
        if (playersSortedByScore.length !== 0  && playersSortedByScore[0].points !== 0) {
            let lastRank = 0;
            for (let i = 0; i < playersSortedByScore.length; i++) {
                let current = playersSortedByScore[i];
                lastRank += (i > 0 && current.points === playersSortedByScore[i - 1].points) ? 0 : 1;
                ranks.push({id: current.id, ranking: lastRank, name: current.name});
            }
        }

        return ranks;
    }

    addWord(listKey, item) {
        this.wordLists[listKey].push(item);
    }

    removeWord(listKey, item) {
        let deletionIndex = this.wordLists[listKey].indexOf(item);
        if (deletionIndex !== -1) {
            this.wordLists[listKey].splice(deletionIndex, 1);
        }
    }

    hasWord(listKey, item) {
        return this.wordLists[listKey].indexOf(item) !== -1;
    }

    getWordLists() {
        let lists = {};
        for (const [k,v] of Object.entries(this.wordLists)) {
            lists[k] = v.join(',');
        }

        return lists;
    }

    getWordSearchLabels() {
        let labels = [];
        for (const [k,v] of Object.entries(this.wordLists)) {
            if (v.length > 0) {
                let randIndex = Math.floor(Math.random()*v.length);
                labels.push({sound:k, label:this.wordLists[k][randIndex]});
            }

        }

        Util.shuffle(labels);

        return labels;
    }

}

module.exports = {
    Room: Room,
    TYPE_GROUP: TYPE_GROUP,
    TYPE_INDIVIDUAL: TYPE_INDIVIDUAL,
    KEY_ASSIGN_USERNAMES: KEY_ASSIGN_USERNAMES
};