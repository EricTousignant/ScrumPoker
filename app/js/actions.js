
var ScrumPokerURL = 'ws://' + window.location.hostname + ':8888';

var ScrumPoker = function ScrumPoker(user, room) {
    this.user = user;
    this.room = room;
    this.userVote = null;
    this.roomVote = false;
    this.roomUsers = [];
    this.roomVotes = {};
};

ScrumPoker.prototype.log = function ScrumPoker_log(message) {
    var d = new Date();
    var h = d.getHours();
    var m = d.getMinutes();
    var s = d.getSeconds();
    var msg =  (h < 10 ? '0' + h : h) + ':';
        msg += (m < 10 ? '0' + m : m) + ':';
        msg += (s < 10 ? '0' + s : s) + ' ';
        msg += message;
    app.debugLog.push(msg);
};

ScrumPoker.prototype.connect = function ScrumPoker_connect(onopen_cb) {
    var that = this;

    // close existing connection
    if (typeof this.ws === 'object') {
        this.ws.terminate();
    }

    this.ws = new WebSocket(ScrumPokerURL);

    this.ws.onopen = function ScrumPoker_onOpen(e) {
        console.log('onOpen:', e);
        that.log('Connection established');
        if (typeof onopen_cb === 'function') {
            onopen_cb();
        }
    };

    this.ws.onmessage = function ScrumPoker_onMessage(e) {
        console.log('onMessage:', e);
        ScrumPokerActions(e.data);
    };

    this.ws.onerror = function ScrumPoker_onError(e) {
        console.log('onError:', e);
    };

    this.ws.onclose = function ScrumPoker_onClose(e) {
        console.log('onClose:', e);
        app.session.log('Connection terminated');
        app.joinMessage = {
            class: 'alert-danger',
            html: 'Connection terminated'
        };
        app.goTo('join');
    };
};

ScrumPoker.prototype.send = function ScrumPoker_send(action, data) {
    var payload = {
        action: action
    };
    if (data) {
        payload.data = data;
    }
    this.ws.send(JSON.stringify(payload));
};



// ACTIONS

var ScrumPokerActions = function SPA(data) {
    if (data = parseJSON(data)) {
        try {
            ScrumPokerActions[data.action](data.data);
        } catch(e) {
            console.error(e);
        }
    }
};

ScrumPokerActions.roomCreated = function SPA_createdRoom(roomID) {
    app.session.room = roomID;
    app.session.send('listUsers');
    app.goTo('admin');
};

ScrumPokerActions.usernameSet = function SPA_usernameSet(user) {
    app.session.log('Welcome "' + user + '"!');
    app.session.user = user;
    app.isOffline = false;
};

ScrumPokerActions.roomNotFound = function SPA_roomNotFound(roomID) {
    app.session.log('Couldn\'t find room "' + roomID + '"');
    app.session.room = roomID;
    app.joinMessage = {
        class: 'alert-danger',
        html: 'Room "' + roomID + '" does not exist. <nobr>Please try again</nobr>'
    };
    app.goTo('join');
};

ScrumPokerActions.roomJoined = function SPA_roomJoined(roomID) {
    app.session.log('Joined room "' + roomID + '"');
    app.message = {
        class: 'alert-success',
        html: 'Connected to room "' + roomID + '"'
    };
    app.goTo('poker');
};

ScrumPokerActions.listUsers = function SPA_listUsers(users) {
    app.session.roomUsers = users;
    app.$forceUpdate()
};

ScrumPokerActions.voteOpen = function SPA_voteOpen(data) {
    app.session.log('Vote has started');
    // If user was on "break", restore to "on break"
    if (app.session.userVote === 'B') {
        setTimeout(function() {
            app.session.userVote = 'B';
        }, 50);
    }
    app.session.userVote = null;
    app.session.roomVote = true;
    app.message = {
        class: 'alert-success',
        html: 'Voting has started!'
    };

    if (app.page === 'admin') {
        app.session.roomVotes = {};
        app.session.roomVoted = false;
    }
};

ScrumPokerActions.voteReceived = function SPA_voteReceived(data) {
    app.session.log('Vote has been received');

};

ScrumPokerActions.voteIgnored = function SPA_voteReceived(data) {
    app.session.log('Voting has not started yet');

};

ScrumPokerActions.userVoted = function SPA_userVoted(data) {
    if (app.page === 'admin') {
        app.session.log('User ' + data.user + ' has voted ' + data.vote);

        if (data.vote === null || data.vote === undefined) {
            delete app.session.roomVotes[data.user];
        } else {
            app.session.roomVotes[data.user] = data.vote;
        }

        app.session.roomVotesCount = Object.keys(app.session.roomVotes).length;
        app.session.roomVotesPercent = Math.ceil((app.session.roomVotesCount / app.session.roomUsers.length) * 100);

        if (app.session.roomVotesCount === app.session.roomUsers.length) {
            app.closeVote();
        }
    }
};

ScrumPokerActions.voteClosed = function SPA_voteClosed(data) {
    app.session.log('Vote is completed');
    app.session.roomVote = false;
    app.message = {
        class: 'alert-danger',
        html: 'Voting has closed!'
    };
};

ScrumPokerActions.disconnected = function SPA_disconnected(data) {
    app.session.log('Disconnected');
    app.message = {
        class: 'alert-danger',
        html: 'You were disconnected!'
    };
    app.goto('home');
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
