//Pre-load utilities
//Core software
var app = require('express')();
//HTTP server
var http = require('http').Server(app);
//Socket.io component
var io = require('socket.io')(http);
//Debugging tools
var util = require('util');
//Database tools
var db = require('orchestrate')(process.argv[2]);
//Valid keys will be stored in this array
var validkeys = [];
//An array storring authenticated clients
//In order to only emit to those
var clients = [];

//hashCode Module
/*
  The hashCode module is a simple cryptographic prototype that will allow to get a hash of any string.
*/
String.prototype.hashCode = function() {
    var hash = 0,
        i, chr, len;
    if (this.length === 0) return hash;
    for (i = 0, len = this.length; i < len; i++) {
        chr = this.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
};

//getName Module:
/*
  The get name module is designed to associate the user id with a username.
*/

function getname(id) {
    return namelist[id];
}

//Send out login page. (No backend code whatsoever for this.)
app.get('/login', function(req, res) {
    res.sendFile(__dirname + '/login.html');
});

//Send out the default chat client for the root
app.get('/', function(req, res) {
    res.sendFile(__dirname + '/client.html');
});

//Check key (requires username, key and socketid)
function checkkey(user, key, sid) {
    return (validkeys[sid] === user + "|" + key);
}

//Loads static files from the /files/ directory such as images, css, js, etc..
app.get('/files/:file', function(req, res) {
    var filename = req.params.file;
    res.sendFile(__dirname + '/files/' + filename);
});


//Login Module
var clients = [];

var namelist = [];

function login(user, pass, sid, key) {
    console.log("User " + user + " is trying to authenticate");
    db.get('users', user)
        .then(function(res) {
            if (res.body.password.hashCode() == pass) {
                console.log("Login Valid!");
                validkeys[sid] = (user + "|" + key);
                console.log("User " + user + " validated with the key " + user + "|" + key);

                namelist[user] = res.body.name;
                connect(sid, user);
                io.to(sid).emit("authentication", true);

            } else {
                console.log("User " + user + " failed to authenticate");
                io.to(sid).emit("authentication", false);
            }
        }).fail(function(err) {
            console.log("User " + user + " failed to authenticate (Does not exist!)");
            io.to(sid).emit("authentication", false);
        })
}
var connectedClients = [];

function countClients(user) {
    var c = 0;
    for (var i in connectedClients) {
        for (var j in connectedClients[i]) {
            var u = connectedClients[i];
            if (u == user) {
                c++;
            }
        }
    }
    return c;
}

function connect(socketid, username) {
    if (countClients(username) == 0) {
        clients.forEach(function(element, index, array) {
            io.to(element).emit("new user", getname(username));
        });
        console.log("New user: " + username);
    }
    clients.push(socketid);
    connectedClients[socketid] = username;
    console.log(countClients(username));
}

function disconnect(socketid) {
    var username = connectedClients[socketid];
    if (username == undefined) {
        return 0;
    }
    delete connectedClients[socketid];
    delete validkeys[socketid];
    if (countClients(username) == 0) {
        clients.forEach(function(element, index, array) {
            io.to(element).emit("user left", getname(username));
        });
        console.log("User left: " + username);
    }
}


io.on('connection', function(socket) {
    socket.on('auth', function(user) {
        login(user.usr, user.pass, socket.id, user.key);
    });
    socket.on('disconnect', function() {
        disconnect(socket.id);
    });
    socket.on('prevmsg', function(obj) {
        if (checkkey(obj.user, obj.key, socket.id)) {
            //Handle limits later on
            db.list('messages', {
                    sort: '@path.reftime:desc',
                    limit: '100'
                })
                .then(function(result) {
                    var items = result.body.results;
                    io.to(socket.id).emit("prevmsg", items.reverse());
                })
                .fail(function(err) {

                });
        }
    });

    function getTimestamp() {
        return Date.now();
    }
    socket.on('chat message', function(obj) {
        if (checkkey(obj.user, obj.key, socket.id)) {
            if (!(obj.msg == "")) {
                delete obj.key;
                obj.type = "text";
                obj.name = getname(obj.user);
                obj.time = getTimestamp();
                clients.forEach(function(element, index, array) {
                    io.to(element).emit('chat message', obj);
                });
                if (obj.store == true) {
                    db.post('messages', obj);
                }
            }
        } else {
            //Notify about issues concerning authenication
            console.log("Auth failed while chatting");
            io.to(socket.id).emit("authentication", false);
        }
    });

    var imgur = require('imgur');

    function shareImage(obj) {

        obj.data = obj.data.replace(/^data:image\/(png|gif|jpeg);base64,/, '');
        imgur.uploadBase64(obj.data)
            .then(function(json) {
                delete obj.id;
                //Force https
                obj.data = json.data.link.replace("http:", "https:");
                clients.forEach(function(element, index, array) {
                    io.to(element).emit('image', obj);
                });
                obj.type = "img";
                db.post('messages', obj);
            })
            .catch(function(err) {
                io.to(obj.id).emit("Error", err.message);
                console.error(err.message);
            });
    }

    socket.on('image', function(obj) {
        if (checkkey(obj.user, obj.key, socket.id)) {
            console.log(obj.user, obj.key, socket.id);
            var base64regex = /[A-Za-z0-9+/=]/;
            if (base64regex.test(obj.data)) {
                delete obj.key;
                obj.id = socket.id;
                obj.time = getTimestamp();
                obj.name = getname(obj.user);
                shareImage(obj);
            } else {
                console.log("Image invalid.");
            }
        } else {
            //Notify about issues concerning authenication
            console.log("Auth failed while chatting");
            io.to(socket.id).emit("authentication", false);
        }
    });

    socket.on('typingMessage', function(obj) {
        if (checkkey(obj.username, obj.key, socket.id)) {
            delete obj.key;
            obj.name = getname(obj.username);
            if (obj.state) {
                clients.forEach(function(element, index, array) {
                    io.to(element).emit('typing', obj);
                });
            } else {
                clients.forEach(function(element, index, array) {
                    io.to(element).emit('stoptyping', obj);
                });
            }

        } else {
            //Notify about issues concerning authenication
            console.log("Auth failed while typing");
            io.to(socket.id).emit("authentication", false);
        }
    });

    //Forum module starts
    socket.on('loadAllThreads', function(obj) {
        if (checkkey(obj.user, obj.key, socket.id)) {
            db.search('Threads', "type:thread", {
                    sort: '@path.reftime:desc'
                })
                .then(function(result) {
                    var items = result.body.results;
                    io.to(socket.id).emit("Thread List", items);
                })
                .fail(function(err) {
                    console.log(err);
                });
        }
    });
    socket.on('loadFilterThreads', function(obj) {
        if (checkkey(obj.user, obj.key, socket.id)) {
            var searchStr = "type:thread AND cat:" + obj.filter;
            if (obj.filter == "0") {
                searchStr = "type:thread";
            }

            console.log("type:thread AND cat:" + obj.filter);
            db.search('Threads', searchStr, {
                    sort: '@path.reftime:desc'
                })
                .then(function(result) {
                    var items = result.body.results;
                    io.to(socket.id).emit("Thread List", items);
                })
                .fail(function(err) {
                    console.log(err);
                });
        }
    });
    socket.on('image2url', function(obj) {
        if (checkkey(obj.user, obj.key, socket.id)) {
            obj.data = obj.data.replace(/^data:image\/(png|gif|jpeg);base64,/, '');
            imgur.uploadBase64(obj.data)
                .then(function(json) {
                    io.to(socket.id).emit('forumimg', json.data.link.replace("http:", "https:"));
                })
                .catch(function(err) {
                    io.to(socket.id).emit("Error", err.message);
                    console.error(err.message);
                });
        }
    });
    socket.on('image2url2', function(obj) {
        if (checkkey(obj.user, obj.key, socket.id)) {
            obj.data = obj.data.replace(/^data:image\/(png|gif|jpeg);base64,/, '');
            imgur.uploadBase64(obj.data)
                .then(function(json) {
                    io.to(socket.id).emit('postimg', json.data.link.replace("http:", "https:"));
                })
                .catch(function(err) {
                    io.to(socket.id).emit("Error", err.message);
                    console.error(err.message);
                });
        }
    });
    socket.on("loadSingleThread", function(obj) {
        if (checkkey(obj.user, obj.key, socket.id)) {
            var searchstr = "key: " + obj.id + " || replyto: " + obj.id;
            db.search('Threads', searchstr, {
                    sort: '@path.reftime:asc',
                    limit: '100'
                })
                .then(function(result) {
                    var items = result.body.results;
                    io.to(socket.id).emit("open thread", items);
                })
                .fail(function(err) {
                    console.log(err);
                });
        }
    });
    socket.on("delete thread", function(obj) {
        console.log(obj);
        if (checkkey(obj.user, obj.key, socket.id)) {

            db.get('Threads', obj.id)
                .then(function(res) {
                    var OP = res.body.user;
                    var RD = obj.user;
                    var dp = (OP == RD);
                    if (dp){
                        console.log("Deleting", obj.id);
                        db.remove('Threads', obj.id)
                            .then(function(result) {
                                console.log(obj.id, "deleted");

                                clients.forEach(function(element, index, array) {
                                    io.to(element).emit('thread deleted', obj.id);
                                });
                            })
                            .fail(function(err) {
                                console.log(err);
                            });
                    }
                }).fail(function(err) {

                })


        }
    })
    socket.on('postReply', function(obj) {
        if (checkkey(obj.user, obj.key, socket.id)) {
            if (!(obj.post.image == "" && obj.post.title == "" && obj.post.content == "")) {
                delete obj.key;
                obj.post.poster = getname(obj.user);
                db.post('Threads', obj.post)
                    .then(function(data) {
                        console.log(data.path.key);
                        obj.post.id = data.path.key;
                        console.log(obj.post);
                        clients.forEach(function(element, index, array) {
                            io.to(element).emit('new reply', obj.post);
                        });

                    }).fail(function(err) {

                    });
            }

        }
    });

    socket.on('postThread', function(obj) {
        if (checkkey(obj.user, obj.key, socket.id)) {
            if (!(obj.post.title == "")) {
                delete obj.key;
                obj.post.poster = getname(obj.user);
                db.post('Threads', obj.post)
                    .then(function(data) {
                        console.log(data.path.key);
                        obj.post.id = data.path.key;
                        clients.forEach(function(element, index, array) {
                            io.to(element).emit('new thread', obj.post);
                        });

                    }).fail(function(err) {

                    });
            }

        }
    });
});

http.listen(3000, function() {
    console.log('Messenger started on port 3000');
});

var stdin = process.openStdin();
stdin.addListener("data", function(d) {
    var istr = d.toString().trim();
    io.emit('alert', istr);
});
