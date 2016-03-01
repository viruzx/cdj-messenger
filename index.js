//Pre-load utilities
//Core software
var app = require('express')();

var request = require('sync-request');
//HTTP server
var http = require('http').Server(app);
//Socket.io component
var io = require('socket.io')(http);
//File reading/writing tools
var fs = require('fs');
//Debugging tools
var util = require('util');
//Database tools
var db = require('orchestrate')("8db57077-993b-4c5a-8f83-3d3fc99b3304");
//Sanitization tools
var Entities = require('html-entities').AllHtmlEntities;
entities = new Entities();
//Valid keys will be stored in this array
var validkeys = [];
//An array storring authenticated clients
//In order to only emit to those
var clients = [];


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


function login_legacy(user, pass) {
  //Horribly done login system
  var turl = "https://8db57077-993b-4c5a-8f83-3d3fc99b3304@api.orchestrate.io/v0/users/" + user;
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
}

var namelist = [];

function getname(id) {
  //If your system doesn't support nick names uncomment
  //return id;
  if (namelist[id] == undefined) {
    var turl = "https://8db57077-993b-4c5a-8f83-3d3fc99b3304@api.orchestrate.io/v0/users/" + id;
    var resq = request('GET', turl);
    var hexdata = resq.getBody();
    var data = new Buffer(hexdata, 'hex').toString('utf8');
    var obj = JSON.parse(data);
    namelist[id] = obj.name;
    return obj.name;
  } else {
    return namelist[id];
  }

}


//Send out the default chat client for the root
app.get('/login', function(req, res) {
  res.sendFile(__dirname + '/login.html');
});
app.get('/', function(req, res) {
  res.sendFile(__dirname + '/client.html');
});

//Escape HTML entities
function escape(str) {
  return entities.encode(str);
}

//Check key (requires username and key)
function checkkey(user, key) {
  var check = user + "|" + key;
  if (key.indexOf("|") > -1 || user.indexOf("|") > -1) {
    //Key Tampering Detected
    return false;
  }
  return (validkeys.indexOf(check) > -1);
}
//Load previous messages (Requires a valid key)
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

//Probably a very serious security flaw :/
//Update: Not actually a security flaw! (express handles it)
//Start :file with .. does something weird
app.get('/files/:file', function(req, res) {
  var filename = req.params.file;
  res.sendFile(__dirname + '/files/' + filename);
});
app.get('/images/:file', function(req, res) {
  var filename = req.params.file;
  res.sendFile(__dirname + '/image/' + filename);
});
Array.prototype.remove = function() {
  var what, a = arguments,
    L = a.length,
    ax;
  while (L && this.length) {
    what = a[--L];
    while ((ax = this.indexOf(what)) !== -1) {
      this.splice(ax, 1);
    }
  }
  return this;
};


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
  socket.on('chat message', function(obj) {
    if (checkkey(obj.user, obj.key)) {
      if (!(obj.msg == "")) {
        delete obj.key;
        obj.name = getname(obj.user);
        clients.forEach(function(element, index, array) {
          io.to(element).emit('chat message', obj);
        });
        fs.appendFile('message.html', "<li class='u" + obj.user.hashCode() + "''>" + escape(obj.name + ": " + obj.msg) + "</li>", function(err) {});
      } else {
        console.log("Message ignored because null.");
      }
    } else {
      //Notify about issues concerning authenication
      console.log("Auth failed while chatting");
      io.to(socket.id).emit("authentication", false);
    }
  });

  var imgur = require('imgur');
  function shareImage(obj){
    var obj.data = obj.data.replace(/^data:image\/(png|gif|jpeg);base64,/,'');
    imgur.uploadBase64(obj.data)
    .then(function (json) {
        obj.data = json.data.link;
        console.log(obj.data);
        clients.forEach(function(element, index, array) {
          io.to(element).emit('image', obj);
        });
        fs.appendFile('message.html', "<li class='u" + obj.user.hashCode() + "''>" + escape(obj.name) + ": <img class='image' src='" + obj.data + "'>" + "</li>", function(err) {});
    })
    .catch(function (err) {
        console.error(err.message);
    });
  }

  socket.on('image', function(obj) {
    console.log(obj);
    if (checkkey(obj.user, obj.key)) {
      var base64regex = /[A-Za-z0-9+/=]/;
      if (base64regex.test(obj.data)) {
        delete obj.key;
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
          console.log(obj.username + " is typing.");
        });
      } else {
        clients.forEach(function(element, index, array) {
          io.to(element).emit('stoptyping', obj);
          console.log(obj.username + " is not longer typing.");
        });
      }

    } else {
      //Notify about issues concerning authenication
      console.log("Auth failed while typing");
      io.to(socket.id).emit("authentication", false);
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
