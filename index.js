//Pre-load utilities
//Core software
var app = require('express')();

var request = require('sync-request');
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


/* Legacy Login
function login_legacy(user, pass) {
  //Horribly done login system
  var turl = "https://orchestrate_api_key@api.orchestrate.io/v0/users/" + user;
  var resq = "";
  try {
    resq = request('GET', turl);
  } catch (e) {
    return false;
  } finally {

  }
  if (resq.statusCode != 200) {
    console.log("Account does not exist");
    return false;
  }

  var hexdata = resq.getBody();
  var data = new Buffer(hexdata, 'hex').toString('utf8');
  var obj = JSON.parse(data);
  if (obj.password.hashCode() == pass) {
    console.log("authenticated");
    return true;
  } else {
    return false;
    console.log("Could not authenticate");
  }
  return false;
  console.log("Could not authenticate");
}*/

//This NEEDS to be refactored to load entire user database into memory from the start. Doing this will allow us to cut the request_sync dependency (which is good!). Anyways...

//getName Module:
/*
  The get name module is designed to associate the user id with a username.
*/
var namelist = [];

function getname(id) {
  //If your system doesn't support nick names uncomment
  //return id;

  //Does the name exist in memory?
  if (namelist[id] == undefined) {
    //No!
    //Get the name
    var turl = "https://8db57077-993b-4c5a-8f83-3d3fc99b3304@api.orchestrate.io/v0/users/" + id;
    var resq = request('GET', turl);
    var hexdata = resq.getBody();
    var data = new Buffer(hexdata, 'hex').toString('utf8');
    var obj = JSON.parse(data);
    //Store in memory
    namelist[id] = obj.name;
    //Return
    return obj.name;
  } else {
    //Yes!
    //Return
    return namelist[id];
  }

}

//Send out login page. (No backend code whatsoever for this.)
app.get('/login', function(req, res) {
  res.sendFile(__dirname + '/login.html');
});

//Send out the default chat client for the root
app.get('/', function(req, res) {
  res.sendFile(__dirname + '/client.html');
});

//Check key (requires username and key)
function checkkey(user, key) {
  var check = user + "|" + key;
  if (key.indexOf("|") > -1 || user.indexOf("|") > -1) {
    //Key Tampering Detected
    return false;
  }
  return (validkeys.indexOf(check) > -1);
}
/* Legacy prevmsg
Load previous messages (Requires a valid key)
app.get('/previous/:user/:key', function(req, res) {
  var key = req.params.key;
  var user = req.params.user;
  if (checkkey(user, key)) {
    res.sendFile(__dirname + '/message.html');
  } else {
    res.status(401).send('Invalid key. Either authentication failed or you are doing something you should not be...');
    console.log("Attemped to get messages with invalid key!");
  }
});
*/

//Probably a very serious security flaw :/
//Update: Not actually a security flaw! (express handles it)
//Start :file with ".." does something weird

//Loads static files from the /files/ directory such as images, css, js, etc..
app.get('/files/:file', function(req, res) {
  var filename = req.params.file;
  res.sendFile(__dirname + '/files/' + filename);
});


//Login Module
var clients = [];

function login(user, pass, sid, key) {
  console.log("User " + user + " is trying to authenticate");
  db.get('users', user)
    .then(function(res) {
      if (res.body.password.hashCode() == pass) {
        console.log("Login Valid!");
        validkeys.push(user + "|" + key);
        console.log("User " + user + " validated with the key " + user + "|" + key);
        clients.push(sid);
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
io.on('connection', function(socket) {
  //Legacy Login
  //Poorly designed login that uses synchronous technology instead of async
  /*socket.on('auth', function(user) {
    var validate = login_legacy(user.usr, user.pass);
    if (validate) {
      validkeys.push(user.usr + "|" + user.key);
      console.log("User " + user.usr +
        " validated with the key " + user.usr + "|" + user.key);
      clients.push(socket.id);
      io.to(socket.id).emit("authentication", true);
    } else {
      console.log("Auth failed while authing");
      io.to(socket.id).emit("authentication", false);
    }
  });*/
  socket.on('auth', function(user) {
    login(user.usr, user.pass, socket.id, user.key);
  });
  socket.on('prevmsg', function(obj) {
    if (checkkey(obj.user, obj.key)) {
      //Handle limits later on
      db.list('messages')
        .then(function(result) {
          var items = result.body.results;
          io.to(socket.id).emit("prevmsg", items);
        })
        .fail(function(err) {

        });
    }
  });
  socket.on('chat message', function(obj) {
    if (checkkey(obj.user, obj.key)) {
      if (!(obj.msg == "")) {
        delete obj.key;
        obj.type = "text";
        obj.name = getname(obj.user);
        clients.forEach(function(element, index, array) {
          io.to(element).emit('chat message', obj);
        });
        db.post('messages', obj);
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
    if (checkkey(obj.user, obj.key)) {
      var base64regex = /[A-Za-z0-9+/=]/;
      if (base64regex.test(obj.data)) {
        delete obj.key;
        obj.id = socket.id;
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
    if (checkkey(obj.username, obj.key)) {
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
    if (checkkey(obj.user, obj.key)) {
      db.search('Threads', "type:thread", {
          sort: '@path.reftime:asc'
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
    if (checkkey(obj.user, obj.key)) {
      var searchStr = "type:thread AND cat:" + obj.filter;
      if (obj.filter == "0"){
        searchStr = "type:thread";
      }

      console.log("type:thread AND cat:" + obj.filter);
      db.search('Threads', searchStr , {
          sort: '@path.reftime:asc'
        })
        .then(function(result) {
          var items = result.body.results;
          console.log(items);
          io.to(socket.id).emit("Thread List", items);
        })
        .fail(function(err) {
          console.log(err);
        });
    }
  });
  socket.on('image2url', function(obj) {
    if (checkkey(obj.user, obj.key)) {
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

  socket.on('postThread', function(obj) {
    if (checkkey(obj.user, obj.key)) {
      if (!(obj.post.image == "" && obj.post.title == "" && obj.post.content == "")) {
        delete obj.key;
        obj.post.poster = getname(obj.user);
        delete obj.user;
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
