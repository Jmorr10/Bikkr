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
const HEROKU = 'https://dev-boinkikurenshuu.herokuapp.com';

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
            testClient.emit(Events.ROOM_SETUP, TEST_ROOM, Room.TYPE_GROUP, {groupType: Group.TYPE_ALL_FOR_ONE, numStudents: 41});
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
                  {groupType: Group.TYPE_ALL_FOR_ONE, numStudents: 41, assignGroups: true});

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

    function connectClient(testFunc) {
        testClient = io.connect(socketURL, options);
        testClient.on('connect', testFunc);
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
                testClient.emit(Events.ROOM_SETUP, TEST_ROOM, Room.TYPE_GROUP, {groupType: Group.TYPE_ALL_FOR_ONE, numStudents: 41, assignGroups: true});
                testFunc();
            });
        });
    }
});