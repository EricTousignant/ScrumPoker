
var app = '';

window.onload = function() {

    app = new Vue({
        el: '#app',
        data: {
            // Loading Overlay
            loading: false,
            // Menus
            menuOpen: false,
            menuSettingsOpen: false,
            // Display
            page: 'home',
            joinMessage: false,
            // ScrumPoker
            isOffline: true,
            message: {
                class: 'alert-warning',
                html: 'Your are currently in offline mode!'
            },
            session: {
                user: sessionStorage.getItem('user'),
                room: sessionStorage.getItem('room'),
                userVote: null,
                roomVote: false,
                roomUsers: [],
                roomVotes: {},
            },
            showVote: false,
            buttons: [0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 'I', 'U', 'B'],
            // DebugLog
            showDebugLog: false,
            debugLog: []
        },
        filters: {
            // Force specific button text for 3 buttons (infinity, unknown, break pause)
            buttonHTML: function (button) {
                switch(button) {
                    case 'I':
                        return '&infin;';
                    case 'U':
                        return'?';
                    case 'B':
                        return '<span class="glyphicon glyphicon-time"></span>';
                }
                return button;
            },
            debugLogFilter: function(data) {
                var text = '';

                if (Array.isArray(data)) {
                    data.forEach(function(line) {
                        text += line + '\n';
                    })
                }
                return text;
            }
        },
        methods: {
            goTo: function(page) {
                var scope = this;
                scope.loading = true;
                setTimeout(function() {
                    scope.page = page;
                    scope.loading = false;
                    scope.menuOpen = false;
                }, 400);
            },
            createRoom: function() {
                var scope = this;
                scope.loading = true;
                scope.session = new ScrumPoker('admin', '');
                scope.session.connect(function() {
                    scope.session.send('createRoom');
                });
            },
            openWS: function() {
                var scope = this;
                if (scope.session.user && scope.session.room) {
                    scope.session = new ScrumPoker(
                        scope.session.user,
                        scope.session.room
                    );
                    scope.session.connect(function() {
                        scope.session.send('setUsername', scope.session.user);
                        scope.session.send('joinRoom', scope.session.room);
                    });
                    scope.loading = true;
                } else {
                    scope.joinMessage = {
                        class: 'alert-danger',
                        html: 'Please enter a username and room ID!'
                    }
                }
            },
            openVote: function(vote) {
                this.session.send('openVote');
                this.showVote = false;
            },
            closeVote: function(vote) {
                this.session.roomVoted = true;
                this.session.send('closeVote');
            },
            sendVote: function(vote) {
                this.session.userVote = (vote === this.session.userVote ? null : vote);
            }
        },
        created: function() {
            // Avoid FOUC
            setTimeout(function() {
                document.querySelector('html').classList.remove('no-js');
            }, 400);
        }
    });


    app.$watch('session.user', function (value) {
        sessionStorage.setItem('user', value);
    });


    app.$watch('session.room', function (value) {
        sessionStorage.setItem('room', value);
    });


    app.$watch('session.userVote', function (userVote) {
        if (!app.isOffline) {
            userVote = (userVote === null ? null : userVote.toString());
            app.session.send('sendVote', userVote);
        }
    });

};


