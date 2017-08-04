/**
 * WebSockets Server
 *
 * Source: https://github.com/einaros/ws
 */

module.exports = {
    server: function() {

        const WebSocket = require('ws');
        const wss = new WebSocket.Server({ port: 8888 });

        function heartbeat() { this.isAlive = true; }
        const heartbeat_interval = setInterval(function ping() {
            Object.keys(rooms).forEach(function(roomID) {
                var room = rooms[roomID];
                if (room.admin.readyState !== 1) {
                    wsLeave(room.admin);
                } else {
                    room.users.forEach(function(user) {
                        if (user.readyState !== 1) {
                            wsLeave(user);
                        }
                    })
                }
            });
        }, (5 * 1000));

        function listUsers() {
            var allUsers = [];

            Object.keys(rooms).forEach(function(roomID) {
                if (rooms[roomID].admin) {
                    allUsers.push('(' + roomID + ') ' + rooms[roomID].admin.user);
                }
                var users = listUsersInRoom(roomID);
                users.forEach(function(user) {
                    allUsers.push('(' + roomID + ') ' + user);
                });
            });
            return allUsers;
        }

        function listUsersInRoom(roomID) {
            return rooms[roomID].users.map(function(client) {
                return client.user;
            });
        }

        wss.on('connection', function connection(ws) {
            ws.isAlive = true;
            ws.on('pong', heartbeat);

            // When a message is received to the server...
            ws.on('message', function incoming(data) {
                ScrumPokerActions(ws, data);
            });
        });



        // ACTIONS

        var wsSend = function send(ws, action, data) {
            var payload = {
                action: action
            };
            if (data) {
                payload.data = data;
            }
            ws.send(JSON.stringify(payload));
        };

        var wsLeave = function wsLeave(ws) {

            if (ws.room) {
                var room = rooms[ws.room];

                if (ws.isAdmin) {
                    room.users.forEach(function(ws2) {
                        wsSend(ws2, 'disconnected');
                        ws2.terminate();
                    });
                    delete rooms[ws.room];
                } else {
                    if (room) {
                        if (i = room.users.indexOf(ws)) {
                            delete room.users[i];
                            room.users = room.users.filter(function(){return true;});
                            ScrumPokerActions.listUsers(room.admin);
                        }
                    }
                }
            }

            ws.terminate();
        };

        var ScrumPokerActions = function SPA(ws, data) {
            if (data = parseJSON(data)) {
                try {
                    ScrumPokerActions[data.action](ws, data.data);
                } catch(e) {
                    console.error(e);
                }
            }
        };

        var rooms = {};
        ScrumPokerActions.createRoom = function SPA_createRoom(ws) {
            var roomID = '';
            while (roomID.length === 0) {
                roomID = Math.random().toString(34).toUpperCase().replace(new RegExp(/[0O]/g), '').substr(2,6);
                if (typeof rooms[roomID] !== 'undefined') {
                    roomID = '';
                }
            }

            rooms[roomID] = {
                admin: ws,
                users: [],
                voting: false,
                votes: {}
            };

            ws.isAdmin = true;
            ws.user = roomID + '_admin';
            ws.room = roomID;

            wsSend(ws, 'roomCreated', roomID);
            console.log('Room "' + roomID + '" has been created');
        };

        ScrumPokerActions.setUsername = function SPA_setUsername(ws, user) {
            ws.user = user;
            wsSend(ws, 'usernameSet', user);
        };

        ScrumPokerActions.joinRoom = function SPA_joinRoom(ws, roomID) {
            console.log('User "' + ws.user + '" joined room "' + roomID + '"');
            if (typeof rooms[roomID] === 'undefined') {
                wsSend(ws, 'roomNotFound', roomID);
                wsLeave(ws);
            } else {
                var room = rooms[roomID];
                ws.room = roomID;
                room.users.push(ws);
                wsSend(ws, 'roomJoined', roomID);

                // send update to Admin
                ScrumPokerActions.listUsers(room.admin);

                // if voting is active, tell the user
                if (room.voting) {
                    wsSend(ws, 'voteOpen');
                }

                // Echo to console
                console.log('Update list of users in "' + roomID + '":\n' + JSON.stringify(listUsersInRoom(ws.room)));
            }
        };

        ScrumPokerActions.listUsers = function SPA_listUsers(ws) {
            wsSend(ws, 'listUsers', listUsersInRoom(ws.room));
        };

        ScrumPokerActions.openVote = function SPA_openVote(ws) {
            var room = rooms[ws.room];
            wsSend(ws, 'voteOpen');
            room.voting = true;
            room.users.forEach(function each(ws2) {
                wsSend(ws2, 'voteOpen');
            });
        };

        ScrumPokerActions.sendVote = function SPA_sendVote(ws, vote) {
            var room = rooms[ws.room];
            if (room.voting) {
                wsSend(room.admin, 'userVoted', {
                    user: ws.user,
                    vote: vote
                });
                wsSend(ws, 'voteReceived');
            } else {
                wsSend(ws, 'voteIgnored');
            }
        };

        ScrumPokerActions.closeVote = function SPA_closeVote(ws, data) {
            var room = rooms[ws.room];
            wsSend(ws, 'voteClosed');
            room.voting = false;
            room.users.forEach(function each(ws2) {
                wsSend(ws2, 'voteClosed');
            });
        };



        // EXTRA STUFF

        function parseJSON(jsonString){
            try {
                var o = JSON.parse(jsonString);

                // Cases with no exception thrown
                if (o && typeof o === "object") {
                    return o;
                }
            }
            catch (e) {}
            return false;
        }
    }
}