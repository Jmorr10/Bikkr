let request = require('supertest');
const assert = require("assert");
// This module must be loaded AFTER the server has been started.
let Player;
const Events = require('./event_types');
const Room = require('./room');
const RoomList = require('./room_list');
const PlayerList = require('./player_list');
const Group = require('./group');
const TEST_ROOM = 'AAAA';
const TEST_ROOM_INVALID = 'AAA';
const TEST_GROUP = 'Group 1';
const EVENT_MESSAGE_TEST = "message_test";

const LOCAL = "http://127.0.0.1:5000";
const HEROKU = 'https://bikkr.herokuapp.com';

describe('loading express', function () {
    let server;
    let io = require('socket.io-client');
    let sio;
    let socketURL = LOCAL;
    let options ={
        transports: ['websocket'],
        'force new connection': true
    };
    let testClient;
    let testClient2;

    before(function () {
        server = require('./www').server;
        Player = require("./player");
        sio = require('./www').sio;
    });

    beforeEach(function () {
        if (testClient) {
            testClient.close(true);
        }
        if (testClient2) {
            testClient2.close(true);
        }
        testClient = null;
        testClient2 = null;
        RoomList.reset();
        PlayerList.reset();
    });

    it('responds to /teacher', function testSlash(done) {
        request(server)
            .get('/teacher')
            .expect(200, done);
    });

    it('404 everything else', function testPath(done) {
        console.log('test 404');
        request(server)
            .get('/foo/bar')
            .expect(404, done);
    });

    it('processes room creation requests', function testCreateRoom(done) {
        connectClient(function () {
            testClient.emit(Events.CLIENT_CONNECTED, true);
            let nameTooShort = false;

            testClient.on(Events.RENDER_TEMPLATE, checkRoomNameLen);

            testClient.emit(Events.NEW_ROOM, TEST_ROOM_INVALID);

            testClient.on(Events.ROOM_JOINED, function () {
                if (nameTooShort) {
                    done();
                } else {
                    throw Error("Failed.");
                }
            });

            function checkRoomNameLen (template) {
                if (template.indexOf('roomNameForm') !== -1) {
                    return;
                } else if (template.indexOf("characters") !== -1) {
                    nameTooShort = true;
                }

                testClient.removeListener(Events.RENDER_TEMPLATE, checkRoomNameLen);
                testClient.emit(Events.NEW_ROOM, TEST_ROOM);
            }
        });
    });

    it('handles duplicate room names', function testCreateRoom(done) {

        function testFunc() {
            testClient = io.connect(socketURL, options);
            testClient.emit(Events.CLIENT_CONNECTED, true);
            testClient.emit(Events.NEW_ROOM, TEST_ROOM);

            testClient.on(Events.ROOM_JOINED, function (template, roomID) {
                if (roomID && roomID === TEST_ROOM) {
                    throw Error("Failed.");

                } else if (roomID) {
                    done();
                }
            });
        }


        createRoom(testFunc);
    });

    it('handles room option request - individual', function testRoomOptions(done) {

        function sendOptions() {
            testClient.on(Events.ROOM_SET_UP, testFunc);
            testClient.emit(Events.ROOM_SETUP, TEST_ROOM, Room.TYPE_INDIVIDUAL, {});
        }

        function testFunc() {
            done();
        }

        createRoom(sendOptions);

    });

    it('handles room option request - group', function testRoomOptions(done) {

        function sendOptions() {
            testClient.on(Events.ROOM_SET_UP, testFunc);
            testClient.emit(Events.ROOM_SETUP, TEST_ROOM, Room.TYPE_GROUP, {groupType: Group.TYPE_ONE_FOR_ALL, numStudents: 41});
        }

        function testFunc() {
            done();
        }

        createRoom(sendOptions);

    });

    it('allows students to join a room', function testStudentJoinRoom(done) {
        function testFunc() {
            testClient.on(Events.ROOM_SET_UP, nextStep);
            testClient.emit(Events.ROOM_SETUP, TEST_ROOM, Room.TYPE_INDIVIDUAL, {});
        }

        function nextStep() {
            testClient2 = io.connect(socketURL, options);
            testClient2.emit(Events.CLIENT_CONNECTED, false);
            testClient2.on(Events.ROOM_JOINED, finish);
            testClient2.emit(Events.JOIN_ROOM, TEST_ROOM);
        }

        function finish() {
            done();
        }

        createRoom(testFunc);

    });

    it('allows students to join a group', function testStudentJoinGroup(done) {
        function testFunc() {
            testClient2 = io.connect(socketURL, options);
            testClient2.emit(Events.CLIENT_CONNECTED, false);
            testClient2.emit(Events.JOIN_ROOM, TEST_ROOM);
            testClient2.on(Events.GROUP_JOINED, finish);
            testClient2.emit(Events.JOIN_GROUP, TEST_ROOM, TEST_GROUP);
        }

        function finish() {
            done();
        }

        createGroupAFORoom(testFunc);

    });

    it('allows for group overloading', function testGroupOverloading(done) {

        let clients = [];

        function testFunc() {
              testClient.emit(Events.ROOM_SETUP, TEST_ROOM, Room.TYPE_GROUP,
                  {groupType: Group.TYPE_ONE_FOR_ALL, numStudents: 41, assignGroups: true});

              for (let i = 0; i < 41; i++) {
                  let client = io.connect(socketURL, options);
                  clients.push(client);
                  if (i === 40) {
                      client.on(Events.USERNAME_OK, finish);
                  }
                  client.emit(Events.CLIENT_CONNECTED, false);
                  client.emit(Events.JOIN_ROOM, TEST_ROOM);
                  client.emit(Events.SET_USERNAME, TEST_ROOM, `USER ${i}`);
              }
          }

          function finish(template, playerName, roomID, groupID) {
              let count = RoomList.getRoomByID(TEST_ROOM).groups.reduce(function (acc, currVal, currIdx, arr) {
                  return acc + currVal.playerCount;
              }, 0);
              assert(count === 41);

              for (let i = 0; i < clients.length; i++) {
                  clients[i].close();
              }

              done();
          }

          createRoom(testFunc);
    });

    it('emits events to an entire room', function testRoomBroadcast(done) {
        function testFunc() {

            testClient.on(Events.ROOM_SET_UP, otherPlayerJoin);
            testClient.emit(Events.ROOM_SETUP, TEST_ROOM, Room.TYPE_INDIVIDUAL, {});
        }

        function otherPlayerJoin() {
            testClient2 = io.connect(socketURL, options);
            testClient2.emit(Events.CLIENT_CONNECTED, false);
            testClient2.on(Events.ROOM_JOINED, nextStep);
            testClient2.emit(Events.JOIN_ROOM, TEST_ROOM);
        }

        function nextStep() {
            testClient.on(EVENT_MESSAGE_TEST, finish1);
            testClient2.on(EVENT_MESSAGE_TEST, finish2);
            sio.to(TEST_ROOM).emit(EVENT_MESSAGE_TEST);
        }

        let t1 = false;
        let t2 = false;
        function finish1() {
            t1 = true;
            finish3();
        }
        function finish2() {
            t2 = true;
            finish3();
        }
        function finish3() {
            if (t1 && t2) {
                done();
            }
        }

        createRoom(testFunc);

    });

    let counter = 0;

    it('processes student answers - individual', function testStudentResponsesIndividual(done) {

        let testClient3;

        function sendOptions() {
            testClient.on(Events.ROOM_SET_UP, setQuestion);
            testClient.emit(Events.ROOM_SETUP, TEST_ROOM, Room.TYPE_INDIVIDUAL, {});
        }

        function setQuestion() {

            counter++;

            testClient2 = io.connect(socketURL, options);
            testClient2.emit(Events.CLIENT_CONNECTED, false);
            testClient2.emit(Events.JOIN_ROOM, TEST_ROOM);

            testClient3 = io.connect(socketURL, options);
            testClient3.emit(Events.CLIENT_CONNECTED, false);
            testClient3.emit(Events.JOIN_ROOM, TEST_ROOM);


            testClient.on(Events.QUESTION_READY, answerQuestion);
            testClient.emit(Events.SET_QUESTION, TEST_ROOM, 'LONG_I');
        }

        function answerQuestion() {
            testClient.on(Events.QUESTION_FINISHED, testFunc);
            testClient2.emit(Events.STUDENT_RESPONSE, TEST_ROOM, 'LONG_I');
            testClient3.emit(Events.STUDENT_RESPONSE, TEST_ROOM, 'LONG_I');
        }

        function testFunc() {
            let player1 = PlayerList.getPlayerBySocketID(testClient2.id);
            let player2 = PlayerList.getPlayerBySocketID(testClient3.id);
            if (player2.points === 0 && player1.points === 1) {
                done();
            }
        }

        createRoom(sendOptions);
    });

    it('processes student answers - group', function testStudentResponsesIndividual(done) {

        function setQuestion() {

            for (let i = 0; i < 40; i++) {
                let client = io.connect(socketURL, options);
                client.emit(Events.CLIENT_CONNECTED, false);
                client.emit(Events.JOIN_ROOM, TEST_ROOM);
                client.emit(Events.SET_USERNAME, TEST_ROOM, `USER ${i}`);
            }

            testClient2 = io.connect(socketURL, options);

            testClient2.on(Events.USERNAME_OK, function () {
                testClient.on(Events.QUESTION_READY, answerQuestion);
                testClient.emit(Events.SET_QUESTION, TEST_ROOM, 'LONG_I');
            });

            testClient2.emit(Events.CLIENT_CONNECTED, false);
            testClient2.emit(Events.JOIN_ROOM, TEST_ROOM);
            testClient2.emit(Events.SET_USERNAME, TEST_ROOM, 'TESTCLIENT2');

        }

        function answerQuestion() {
            testClient2.on(Events.QUESTION_FINISHED, testFunc);
            testClient2.emit(Events.STUDENT_RESPONSE, TEST_ROOM, 'LONG_I');
        }

        function testFunc() {
            let player = PlayerList.getPlayerBySocketID(testClient2.id);
            let group = RoomList.getRoomByID(TEST_ROOM).findGroupByPlayer(player);
            if (player && player.points === 0 && group && group.points === 1) {
                done();
            }
        }

        createGroupAFORoom(setQuestion);
    });

    it('sends FFA scores at the end of a game', function (done) {

        let clients = [];

        function testFunc() {
            for (let i = 0; i < 41; i++) {
                let client = io.connect(socketURL, options);
                clients.push(client);
                if (i === 40) {
                    client.on(Events.USERNAME_OK, next1);
                }
                client.emit(Events.CLIENT_CONNECTED, false);
                client.emit(Events.JOIN_ROOM, TEST_ROOM);
                client.emit(Events.SET_USERNAME, TEST_ROOM, `USER ${i}`);
            }
        }

        function next1() {
            clients[0].once(Events.GAME_OVER_STUDENT, finish);
            testClient.once(Events.GAME_OVER, finish);
            testClient.on(Events.QUESTION_READY, answerQuestion);
            testClient.emit(Events.SET_QUESTION, TEST_ROOM, 'LONG_I');
        }

        let groupsResponded = {};
        function answerQuestion() {

            let groups = RoomList.getRoomByID(TEST_ROOM).groups
            let debugPlayer = clients.find((x) => x.id === groups[0].players[Object.keys(groups[0].players)[0]].id);
            debugPlayer.on(Events.QUESTION_FINISHED, next2);

            for (let i = 0; i < 41; i++) {
                let player = PlayerList.getPlayerBySocketID(clients[i].id);
                let group = player.getGroups()[TEST_ROOM];
                if (!groupsResponded.hasOwnProperty(group.id)) {
                    clients[i].emit(Events.STUDENT_RESPONSE, TEST_ROOM, 'LONG_I');
                    groupsResponded[group.id] = player.name;
                } else {
                    clients[i].emit(Events.STUDENT_RESPONSE, TEST_ROOM, 'LONG_A');
                }
            }
        }

        function next2() {
            testClient.emit(Events.END_GAME, TEST_ROOM);
        }

        let runCount = 0;
        let noDashes = false;
        let teacherTemplateValid = false;
        let studentTemplateValid = false;
        function finish(template) {
            runCount++;
            if (template.indexOf("student-podium") === -1) {
                noDashes = (template.indexOf("---") === -1);
                for (let [k,v] of Object.entries(groupsResponded)) {
                    teacherTemplateValid = (template.indexOf(k) !== -1 && template.indexOf(v) !== -1);
                }
            } else {
                noDashes = (template.indexOf("---") === -1);
                studentTemplateValid = (template.indexOf("1st place") !== -1);
            }
            if (runCount === 2 && noDashes && teacherTemplateValid && studentTemplateValid) {
                cleanup();
            } else if (runCount === 2) {
                throw Error("Passing conditions were not met.");
            }
        }

        function cleanup() {
            for (let i = 0; i < clients.length; i++) {
                clients[i].close();
            }

            done();
        }

        createGroupFFARoom(testFunc);
    });

    it('sends no-data to TEACHER ONLY at end of an FFA game', function (done) {

        let clients = [];
        let studentEventCalled = false;

        function testFunc() {
            for (let i = 0; i < 41; i++) {
                let client = io.connect(socketURL, options);
                clients.push(client);
                if (i === 40) {
                    client.on(Events.USERNAME_OK, next1);
                }
                client.emit(Events.CLIENT_CONNECTED, false);
                client.emit(Events.JOIN_ROOM, TEST_ROOM);
                client.emit(Events.SET_USERNAME, TEST_ROOM, `USER ${i}`);
            }
        }

        function next1() {
            clients[0].once(Events.GAME_OVER_STUDENT, trap);
            testClient.once(Events.GAME_OVER, trap);
            testClient.emit(Events.END_GAME, TEST_ROOM);
        }

        let trapTriggerCount = 0;
        function trap(template) {
            if (trapTriggerCount >= 1) {
                studentEventCalled = true;
            } else {
                trapTriggerCount++;
                finish(template)
            }
        }

        let teacherTemplateValid = false;
        function finish(template) {
            console.log(template);
            teacherTemplateValid = (template.indexOf("no-data-title") !== -1);
            if (!studentEventCalled && trapTriggerCount === 1 && teacherTemplateValid) {
                cleanup();
            } else {
                throw Error("Passing conditions not met.");
            }
        }

        function cleanup() {
            for (let i = 0; i < clients.length; i++) {
                clients[i].close();
            }

            done();
        }

        createGroupFFARoom(testFunc);
    });


    it('correctly computes FFA scores when multiple requests are received in quick succession', function (done) {

        let clients = [];
        this.timeout(0);

        function testFunc() {
            for (let i = 0; i < 41; i++) {
                let client = io.connect(socketURL, options);
                clients.push(client);
                if (i === 40) {
                    client.on(Events.USERNAME_OK, next1);
                }
                client.emit(Events.CLIENT_CONNECTED, false);
                client.emit(Events.JOIN_ROOM, TEST_ROOM);
                client.emit(Events.SET_USERNAME, TEST_ROOM, `USER ${i}`);
            }
        }

        function next1 () {
            testClient.on(Events.QUESTION_READY, answerQuestion);
            testClient.emit(Events.SET_QUESTION, TEST_ROOM, 'LONG_I');
        }

        function answerQuestion() {
            let room = RoomList.getRoomByID(TEST_ROOM);
            let groups = room.groups;
            let debugPlayer = clients.find((x) => x.id === groups[0].players[Object.keys(groups[0].players)[0]].id);
            debugPlayer.on(Events.QUESTION_FINISHED, next2);

            let groupTracker = [];

            for (let i = 0; i < 41; i++) {
                let player = PlayerList.getPlayerBySocketID(clients[i].id);
                let group = room.findGroupByPlayer(player);
                if (groups[2].hasPlayer(player)) {
                    clients[i].emit(Events.STUDENT_RESPONSE, TEST_ROOM, "LONG_I");
                } else if (groupTracker.indexOf(group.id) === -1) {
                    let j = Math.floor(Math.random() * (8 + 1) + 1);
                    for (let i = 0; i < j; i++) {
                        clients[i].emit(Events.STUDENT_RESPONSE, TEST_ROOM, "LONG_I");
                    }
                    groupTracker.push(group.id);
                } else {
                    clients[i].emit(Events.STUDENT_RESPONSE, TEST_ROOM, "LONG_A");
                }
            }
        }

        function next2 () {
            let room = RoomList.getRoomByID(TEST_ROOM);
            let players = room.playerScores;
            for (const x of players) {
                console.log(x.points);
                if (x.points > 1) {
                    throw Error("Scores exceeded 1");
                }
            }
            done();
        }

        createGroupFFARoom(testFunc);

    });

    function connectClient(testFunc) {
        testClient = io.connect(socketURL, options);
        testClient.on('connect', testFunc);
        testClient.on('connect_error', function (e) {
            console.log(e);
        });
    }

    function createRoom(testFunc) {
        connectClient(function () {
            testClient.emit(Events.CLIENT_CONNECTED, true);

            testClient.emit(Events.NEW_ROOM, TEST_ROOM);

            testClient.on(Events.ROOM_JOINED, function () {
                testFunc();
            });
        });
    }

    function createGroupAFORoom(testFunc) {
        connectClient(function () {
            testClient.emit(Events.CLIENT_CONNECTED, true);

            testClient.emit(Events.NEW_ROOM, TEST_ROOM);

            testClient.on(Events.ROOM_JOINED, function () {
                testClient.emit(Events.ROOM_SETUP, TEST_ROOM, Room.TYPE_GROUP, {groupType: Group.TYPE_ONE_FOR_ALL, numStudents: 41, assignGroups: true});
                testFunc();
            });
        });
    }

    function createGroupFFARoom(testFunc) {
        connectClient(function () {
            testClient.emit(Events.CLIENT_CONNECTED, true);

            testClient.emit(Events.NEW_ROOM, TEST_ROOM);

            testClient.on(Events.ROOM_JOINED, function () {
                testClient.emit(Events.ROOM_SETUP, TEST_ROOM, Room.TYPE_GROUP, {groupType: Group.TYPE_FREE_FOR_ALL, numStudents: 41, assignGroups: true});
                testFunc();
            });
        });
    }
});