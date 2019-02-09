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

describe('loading express', function () {
    let server;
    let io = require('socket.io-client');
    let sio;
    let serverSocket;
    let socketURL = 'https://dev-boinkikurenshuu.herokuapp.com';
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
        testClient = io.connect(socketURL, options);
        testClient.emit(Events.CLIENT_CONNECTED, true);

        let nameTooShort = false;

        testClient.on(Events.RENDER_TEMPLATE, checkRoomNameLen);

        testClient.emit(Events.NEW_ROOM, TEST_ROOM_INVALID);

        testClient.on(Events.ROOM_JOINED, function () {
            if (!nameTooShort) {
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

            testClient.on(Events.ROOM_SET_UP, testFunc);
            testClient.emit(Events.ROOM_SETUP, TEST_ROOM, Room.TYPE_INDIVIDUAL, {});


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
            testClient.emit(Events.SET_QUESTION, TEST_ROOM, 'AI');
        }

        function answerQuestion() {
            testClient.on(Events.QUESTION_FINISHED, testFunc);
            testClient2.emit(Events.STUDENT_RESPONSE, TEST_ROOM, 'AI');
            testClient3.emit(Events.STUDENT_RESPONSE, TEST_ROOM, 'AI');
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
                testClient.emit(Events.SET_QUESTION, TEST_ROOM, 'AI');
            });

            testClient2.emit(Events.CLIENT_CONNECTED, false);
            testClient2.emit(Events.JOIN_ROOM, TEST_ROOM);
            testClient2.emit(Events.SET_USERNAME, TEST_ROOM, 'TESTCLIENT2');

        }

        function answerQuestion() {
            testClient2.on(Events.QUESTION_FINISHED, testFunc);
            testClient2.emit(Events.STUDENT_RESPONSE, TEST_ROOM, 'AI');
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

    function createRoom(testFunc) {
        testClient = io.connect(socketURL, options);
        testClient.emit(Events.CLIENT_CONNECTED, true);

        testClient.emit(Events.NEW_ROOM, TEST_ROOM);

        testClient.on(Events.ROOM_JOINED, function () {
            testFunc();
        });
    }

    function createGroupAFORoom(testFunc) {
        testClient = io.connect(socketURL, options);
        testClient.emit(Events.CLIENT_CONNECTED, true);

        testClient.emit(Events.NEW_ROOM, TEST_ROOM);

        testClient.on(Events.ROOM_JOINED, function () {
            testClient.emit(Events.ROOM_SETUP, TEST_ROOM, Room.TYPE_GROUP, {groupType: Group.TYPE_ALL_FOR_ONE, numStudents: 41, assignGroups: true});
            testFunc();
        });
    }

    /*

    it ('generates decks of cards', function testGenerateDeck(done) {
        let CardModule = require('./card');
        let Card = CardModule.Card;
        let CardTypes = CardModule.CardTypes;

        let cardTest = new Card(CardTypes.NUM, 5);

        assert.equal(cardTest.card_type, CardTypes.NUM, "Card type not stored!");
        assert.equal(cardTest.value, 5, "Card value not stored!");


        cardTest = new Card(CardTypes.FOOL);
        assert.equal(cardTest.card_type, CardTypes.FOOL, "Card type not stored!");
        assert.equal(cardTest.value, 1, "Card value not stored!");

        let deck = CardModule.generateDeck();

        assert.equal(deck.length, 21, "There should be 21 cards in a deck!");
        done();

    });

    it('sets up matches using invite codes', function testUsernames(done) {
        testClient = io.connect(socketURL, options);
        testClient2 = io.connect(socketURL, options);

        let player1Code;
        let player2Code;

        testClient.emit('client_connected');
        testClient2.emit('client_connected');

        testClient.emit('new_player', 'AAAA');
        testClient2.emit('new_player', 'BBBB');

        testClient.on('login_success', function (template, inviteCode) {
            player1Code = inviteCode;
            continueInvite();
        });

        testClient2.on('login_success', function (template, inviteCode) {
            player2Code = inviteCode;
            continueInvite();
        });

        let continueBounce = false;
        let player1Ready = false;
        let player2Ready = false;

        function continueInvite() {
            if (player1Code && player2Code && !continueBounce) {
                continueBounce = true;
                testClient2.on('render_template', checkInviteProcessing);
                testClient.emit('connect_via_invite', player2Code);
                testClient.on('render_template', checkReceivedGameboard);

            }
        }

        let inviteProcessing = false;
        function checkInviteProcessing(template) {
            if (template.indexOf("Incoming") !== -1) {
                inviteProcessing = true;
            } else if (template.indexOf("gameboard") !== -1 && inviteProcessing) {
                testClient2.removeListener('render_template', checkInviteProcessing);
                player2Ready = true;
                isEveryoneReady();
            } else {
                throw Error("Player 2 didn't received Incoming Invitation or Gameboard.");
            }
        }

        function checkReceivedGameboard(template) {
            if (template.indexOf("gameboard") !== -1) {
                player1Ready = true;
                isEveryoneReady();
            } else {
                throw Error("Didn't receive gameboard.");
            }
        }

        function isEveryoneReady() {
            if (player1Ready && player2Ready) {
                done();
            }
        }
    });

    it('can calculate the total number of points on the field', function testGetTotalPoints(done) {

        let player = new Player("");
        const C = Card.Card;
        const CT = Card.CardTypes;
        player.field = [
            new C(CT.BEGGAR),
            new C(CT.KING),
            new C(CT.NUM, 2),
            new C(CT.HANGEDMAN),
            new C(CT.NUM, 3)
        ];

        const points = player.getTotalPoints();
        assert.equal(points, 13, 'Number of calculated total points is incorrect!');

        done();
    });

    it('implements the Sorceress card effect', function testSorceressEffect(done) {

        let player = new Player("");
        const C = Card.Card;
        const CT = Card.CardTypes;
        player.field = [
            new C(CT.FOOL),
            new C(CT.THIEF),
            new C(CT.NUM, 2),
            new C(CT.HANGEDMAN),
            new C(CT.NUM, 3)
        ];

        // Make sure cards with normal values are removed.
        player.sendToGraveyardByValue(1);
        assert.equal(player.graveyard.length, 3);
        assert.equal(player.field.length, 2);

        player.graveyard = [];
        player.field = [
            new C(CT.FOOL),
            new C(CT.THIEF),
            new C(CT.NUM, 2),
            new C(CT.HANGEDMAN),
            new C(CT.NUM, 3),
            new C(CT.BEGGAR),
            new C(CT.KING)
        ];

        // Check to make sure cards with 0 values are removed (Beggars and Kings arrays for values)
        player.sendToGraveyardByValue(0);
        assert.equal(player.graveyard.length, 2);
        assert.equal(player.field.length, 5);

        // Value not present... nothing should happen.
        player.sendToGraveyardByValue(4);
        assert.equal(player.graveyard.length, 2);
        assert.equal(player.field.length, 5);

        // Now test via card placement
        runInMatch(testMatchPlacement);

        function testMatchPlacement(player1) {
            player1.myTurn = true;
            player1.hand = [
                new C(CT.SORCERESS)
            ];
            player1.graveyard = [];
            player1.field = [
                new C(CT.FOOL),
                new C(CT.THIEF),
                new C(CT.NUM, 2),
                new C(CT.HANGEDMAN),
                new C(CT.NUM, 3),
                new C(CT.BEGGAR),
                new C(CT.KING)
            ];
            testClient.emit(Events.PLACE_CARD, 0);
            testClient.on(Events.SORCERESS_RESOLVED, function () {
                assert.equal(player1.graveyard.length, 2);
                // Increase by one card from previous tests because we are placing a card on the field
                assert.equal(player1.field.length, 6);
                done();
            });
            testClient.emit(Events.SORCERESS_RESULT, player1.id, 0);
        }
    });

    it('implements the Fool card effect', function testFoolEffect(done){

        let player1 = new Player("");
        const C = Card.Card;
        const CT = Card.CardTypes;
        player1.field = [
            new C(CT.FOOL),
            new C(CT.THIEF),
            new C(CT.NUM, 2),
            new C(CT.HANGEDMAN),
            new C(CT.NUM, 3)
        ];

        let player2 = new Player("");
        player2.field = [
            new C(CT.KING),
            new C(CT.NUM, 4),
            new C(CT.NUM, 2),
            new C(CT.BEGGAR),
            new C(CT.NUM, 3)
        ];

        player1.returnCardFromField(3);
        assert.equal(player1.hand[0].card_type, CT.HANGEDMAN);

        player2.returnCardFromField(4);
        assert.equal(player2.hand[0].value, 3);
        player2.returnCardFromField(4);
        assert.equal(player2.hand.length, 1);

        // Now test via card placement
        runInMatch(testMatchPlacement);

        function testMatchPlacement(player1) {
            player1.myTurn = true;
            player1.hand = [
                new C(CT.FOOL)
            ];
            player1.graveyard = [];
            player1.field = [
                new C(CT.SORCERESS),
                new C(CT.THIEF),
                new C(CT.NUM, 2),
                new C(CT.HANGEDMAN),
                new C(CT.NUM, 3),
                new C(CT.BEGGAR),
                new C(CT.KING)
            ];
            testClient.emit(Events.PLACE_CARD, 0);
            testClient.on(Events.FOOL_RESOLVED, function () {
                assert.equal(player1.hand[0].card_type, Card.CardTypes.SORCERESS);
                assert.equal(player1.field.length, 7);
                done();
            });
            testClient.emit(Events.FOOL_RESULT, player1.id, player1.id, 0);
        }

    });

    it('implements the Hanged Man card effect', function testHangedManEffect(done){

        let player1 = new Player("");
        const C = Card.Card;
        const CT = Card.CardTypes;
        player1.graveyard = [
            new C(CT.FOOL),
            new C(CT.THIEF),
            new C(CT.NUM, 2),
            new C(CT.SORCERESS),
            new C(CT.NUM, 3)
        ];

        player1.restoreFromGraveyard(3);
        assert.equal(player1.hand[0].card_type, CT.SORCERESS);

        player1.restoreFromGraveyard(4);
        assert.equal(player1.hand.length, 1);

        player1.graveyard = [];
        player1.returnCardFromField(0);
        assert.equal(player1.hand.length, 1);

        // Now test via card placement
        runInMatch(testMatchPlacement);

        function testMatchPlacement(player1) {
            player1.myTurn = true;
            player1.hand = [
                new C(CT.HANGEDMAN)
            ];
            player1.graveyard = [
                new C(CT.SORCERESS),
                new C(CT.FOOL),
                new C(CT.NUM, 2),
                new C(CT.NUM, 4),
                new C(CT.NUM, 3),
                new C(CT.BEGGAR),
                new C(CT.KING)
            ];
            testClient.emit(Events.PLACE_CARD, 0);
            testClient.on(Events.HANGEDMAN_RESOLVED, function () {
                assert.equal(player1.hand[0].card_type, Card.CardTypes.FOOL);
                assert.equal(player1.graveyard.length, 6);
                done();
            });
            testClient.emit(Events.HANGEDMAN_RESULT, player1.id, 1);
        }

    });

    it('implements the Thief card effect', function testThiefEffect(done){

        const CC = require('./card');
        const C = CC.Card;
        const CT = CC.CardTypes;

        // Now test via card placement
        runInMatch(testMatchPlacement);

        function testMatchPlacement(player1) {
            player1.myTurn = true;
            player1.hand = [
                new C(CT.THIEF)
            ];

            testClient.emit(Events.PLACE_CARD, 0);
            testClient.on(Events.THIEF_EFFECT_RESULT, function () {
                assert.equal(player1.hand.length, 2);
                assert.equal(player1.field.length, 1);
                done();
            });
        }

    });

    it('implements the Beggar card effect', function testBeggarEffect(done){

        const CC = require('./card');
        const C = CC.Card;
        const CT = CC.CardTypes;

        // Now test via card placement
        runInMatch(testMatchPlacement);

        function testMatchPlacement(player1) {
            player1.myTurn = true;
            player1.hand = [
                new C(CT.BEGGAR)
            ];

            testClient.emit(Events.PLACE_CARD, 0);
            testClient.on(Events.ROUND_OVER, finish);
            testClient.on(Events.PLAYER_YOUR_TURN, function () {
                testClient.emit(Events.PLAYER_PASSES_TURN);
            });
            testClient2.on(Events.PLAYER_YOUR_TURN, function() {
                assert.equal(player1.state.pointsVisible, 0);
                assert.equal(player1.field.length, 1);
                testClient2.emit(Events.PLAYER_PASSES_TURN)
            });

            function finish() {
                testClient.removeListener(Events.ROUND_OVER, finish);
                assert.equal(player1.state.pointsVisible, 1);
                assert.equal(player1.field.length, 1);
                done();
            }
        }

    });

    it('implements the King card effect', function testKingEffect(done){

        const CC = require('./card');
        const C = CC.Card;
        const CT = CC.CardTypes;

        // Now test via card placement
        runInMatch(testMatchPlacement);

        function testMatchPlacement(player1) {
            player1.myTurn = true;
            player1.hand = [
                new C(CT.KING)
            ];

            testClient.emit(Events.PLACE_CARD, 0);
            testClient.on(Events.ROUND_OVER, finish);
            testClient.on(Events.PLAYER_YOUR_TURN, function () {
                testClient.emit(Events.PLAYER_PASSES_TURN);
            });
            testClient2.on(Events.PLAYER_YOUR_TURN, function() {
                assert.equal(player1.state.pointsVisible, 0);
                assert.equal(player1.field.length, 1);
                testClient2.emit(Events.PLAYER_PASSES_TURN)
            });

            function finish() {
                testClient.removeListener(Events.ROUND_OVER, finish);
                assert.equal(player1.state.pointsVisible, 6);
                assert.equal(player1.field.length, 1);
                done();

            }
        }

    });

    it('prevents players from playing a card from their hand while resolving a card effect',
        function testCardResolution(done) {

        runInMatch(function (player1, player2) {

            const C = Card.Card;
            const CT = Card.CardTypes;

            player1.myTurn = true;
            player2.myTurn = false;
            player1.hand[0] = new C(CT.BEGGAR);
            player1.hand.push(new C(CT.HANGEDMAN));
            player1.graveyard.push(new C(CT.BEGGAR));
            testClient.on(Events.HANGEDMAN_SELECTION, function () {
                testClient.emit(Events.PLACE_CARD, 0);
            });
            testClient.on(Events.NEED_TO_RESOLVE, function () {
                done();
            });

            testClient.emit(Events.PLACE_CARD, player1.hand.length - 1);

        });

    });

    it('can send and receive chat messages', function testChatMessages(done) {

        runInMatch(function (player1, player2) {


            testClient.on(Events.RECEIVE_MESSAGE, messageReceived);
            testClient.emit(Events.SEND_MESSAGE, "TEST");

            function messageReceived(message) {
                assert.equal(message.sender, player1.id);
                assert.equal(message.content, "TEST");
                done();
            }

        });




    });
*/

    /**
     * Sets up a match before running a callback testing function
     *
     * @param testFunc The testing function to call when the match has been set up.
     */
    /*
    function runInMatch(testFunc) {
        const PlayerList = require('./player_list');

        testClient = io.connect(socketURL, options);
        testClient2 = io.connect(socketURL, options);

        let player1Code;
        let player2Code;

        testClient.emit('client_connected');
        testClient2.emit('client_connected');

        testClient.emit('new_player', 'AAAA');
        testClient2.emit('new_player', 'BBBB');

        let player1State = {};
        let player2State = {};

        testClient.on('login_success', function (template, inviteCode) {
            player1Code = inviteCode;
            continueInvite();
        });

        testClient2.on('login_success', function (template, inviteCode) {
            player2Code = inviteCode;
            continueInvite();
        });

        let continueBounce = false;
        let player1Ready = false;
        let player2Ready = false;

        function continueInvite() {
            if (player1Code && player2Code && !continueBounce) {
                continueBounce = true;
                testClient2.on('render_template', checkInviteProcessing);
                testClient.emit('connect_via_invite', player2Code);
                testClient.on('render_template', checkReceivedGameboard);
                testClient.on('player_state', function(player1, player2) {
                    player1State = player1;
                    player2State = player2;
                });

                testClient.emit('player_state_request');
            }
        }

        let inviteProcessing = false;
        function checkInviteProcessing(template) {
            if (template.indexOf("Incoming") !== -1) {
                inviteProcessing = true;
            } else if (template.indexOf("gameboard") !== -1 && inviteProcessing) {
                testClient2.removeListener('render_template', checkInviteProcessing);
                player2Ready = true;
                isEveryoneReady();
            } else {
                throw Error("Player 2 didn't received Incoming Invitation or Gameboard.");
            }
        }

        function checkReceivedGameboard(template) {
            if (template.indexOf("gameboard") !== -1) {
                player1Ready = true;
                testClient.removeListener('render_template', checkReceivedGameboard);
                isEveryoneReady();
            } else {
                throw Error("Didn't receive gameboard.");
            }
        }

        function isEveryoneReady() {
            if (player1Ready && player2Ready) {
                let [p1, p2, valid] = PlayerList.getMatchPlayers(player1State.id);
                if (valid) {
                    testFunc(p1, p2);
                }
            }
        }
    }

*/
});