function showimage(isrc) {
  $('.imgcontainer').html("<img src='" + isrc + "'>")
  $('#image-modal').foundation('reveal', 'open');

}
var out = document.getElementById("messages");
// allow 1px inaccuracy by adding 1
var isScrolledToBottom = true;
var enable_beep = true;


//Thing to detect focus
var isActive = true;
var authenticated = false;
window.onfocus = function() {
  isActive = true;
};

window.onblur = function() {
  isActive = false;
};




//Utilities
//Time since
function timeSince(timeStamp) {
  var now = new Date(),
    secondsPast = (now.getTime() - timeStamp.getTime()) / 1000;
  if (secondsPast < 60) {
    return parseInt(secondsPast) + ' seconds ago';
  }
  if (secondsPast < 3600) {
    return parseInt(secondsPast / 60) + ' minutes ago';
  }
  if (secondsPast <= 86400) {
    return parseInt(secondsPast / 3600) + ' hours ago';
  }
  if (secondsPast > 86400) {
    day = timeStamp.getDate();
    month = timeStamp.toDateString().match(/ [a-zA-Z]*/)[0].replace(" ", "");
    year = timeStamp.getFullYear() == now.getFullYear() ? "" : " " + timeStamp.getFullYear();
    return day + " " + month + year;
  }
}
//Escape html
function htmlEntities(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
//Create links
function createlinks() {
  $('.msgtxt').each(function() {
    // Get the content
    var str = $(this).html();
    // Set the regex string
    var regex = /(https?:\/\/([-\w\.]+)+(:\d+)?(\/([\w\/_\-\@\.]*(\?\S+)?)?)?)/ig
      // Replace plain text links by hyperlinks
    var replaced_text = str.replace(regex, "<a href='$1' target='_blank'>$1</a>");
    // Echo link
    $(this).html(replaced_text);
  });
}
//Play a beep
var snd = new Audio("/files/beep.wav");

function play_beep() {
  snd.play();
  return false;
}
//Get hash from string either for security or convinience.
String.prototype.hashCode = function() {
  var hash = 0,
    i, chr, len;
  if (this.length === 0) return hash;
  for (i = 0, len = this.length; i < len; i++) {
    chr = this.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return hash;
};

//Generate 50 char long random string
function makeid() {
  var text = "";
  var possible = "AaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQqRrSsTtUuVvWwXxYyZz";

  for (var i = 0; i < 50; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));

  return text;
}
//User object


if (localStorage.username == null || localStorage.pass == null) {
  location = "/login";
}
if (localStorage.username == "" || localStorage.pass == 0) {
  location = "/login";
}
var uservar = {
  usr: localStorage.username,
  //Hash to protect password
  pass: localStorage.pass.hashCode(),
  //Generate key that will be used to authenticate
  //TODO: Get from cookie
  key: makeid()
};

function adjust() {
  //Decide on spacing
  var totalh = document.documentElement.clientHeight;
  var inputheight = $(".sending").outerHeight();
  var alerth = 45 + 57;
  var messageh = $("#messages").height(totalh - inputheight - alerth);
  //Add .you class to owners' messages
  $(".u" + uservar.usr.hashCode()).addClass('you');

}

function prevmsg() {

  console.log("Downloading messages");
  var obj = {
    user: uservar.usr,
    key: uservar.key
  };
  socket.emit('prevmsg', obj);

  /*
  Legacy prevmsg
  $.get("/previous/" + uservar.usr + "/" + uservar.key, function(data) {
    $("#messages").html(data);
    adjust();
    console.log("Downloaded messages");

    createlinks();
    $(".image").on('click', function(e) {
      showimage($(this).attr('src'));
      $(".download").attr("href", $(".imgcontainer img").attr("src"));
    });
  });*/
}

$(window).on('resize', function() {
  //Compensate for viewport changes
  adjust();
});
//Sending messages

$('form').submit(function() {
  if (authenticated) {
    //Create object with the username, message and their key.
    var obj = {
      user: uservar.usr,
      msg: $('#m').val(),
      key: uservar.key
    };
    socket.emit('chat message', obj);
    //Clear message field
    $('#m').val('');

    timeoutFunction()
      //Prevent form's default action

  }
  return false;
});

//Sockets
//Init socket.io since everything
var socket = io();
//Recieve chat message
function addMsg(obj) {
  /*
  The message container will get appending a message with the
  class of the sender which will be later associated with the
  .you class if the client is the originator in order to be
  moved to the right side. The user class is hashed and
  started by "u" in order to be a valid CSS class.
  The contents of the message between <li> tags will be escaped
  to prevent undesired styling by users.
  */

  $('#messages').append('<li data-time="' + obj.time + '" class="msgtxt u' + obj.user.hashCode() + '"><b>' + obj.name + ":</b> " + htmlEntities(obj.msg) + "</li>");
  $(".msgtxt").unbind("dblclick doubletap");
  $(".msgtxt").on("dblclick doubletap", function() {
      var msgtime = $(this).data("time");
      d = new Date(msgtime);
      alert(timeSince(d));
    });
  }

  //Load previous messages
  socket.on('prevmsg', function(data) {
    data.forEach(function(dataset, index, array) {
      if (dataset.value.type == "img") {
        addimg(dataset.value);
      } else {
        addMsg(dataset.value);
      }
    });
    adjust();
    console.log("Downloaded messages");

    createlinks();
    $(".image").on('click', function(e) {
      showimage($(this).attr('src'));
      $(".download").attr("href", $(".imgcontainer img").attr("src"));
    });

  });

  socket.on('chat message', function(obj) {
    addMsg(obj);

    if (!isActive) {
      if (enable_beep) {
        play_beep();
      }

    }
    //Adjust again just to make sure.
    //This function also calls to add relevant classes
    if (obj.msg.indexOf("http") > -1) {
      createlinks();
    }
    adjust();
    //Make the tab titlebar flash with "New message!" to attract attention
    $.titleAlert("New Message!", {
      //These are here to avoid doing it on focus.
      requireBlur: true,
      stopOnFocus: true,
      //Adjustable values
      duration: 0,
      interval: 700
    });
  });

  function addimg(obj) {
    $('#messages').append($('<li data-time="' + obj.time + '" class="msgimg u' + obj.user.hashCode() + '">').html("<b>" + obj.name + ":</b> <img class='image' src='" + obj.data + "'>"));
  }
  socket.on('image', function(obj) {
    addimg(obj);

    //Adjust again just to make sure.
    //This function also calls to add relevant classes
    adjust();
    $(".image").on('click', function(e) {
      showimage($(this).attr('src'));
    });
    //Make the tab titlebar flash with "New message!" to attract attention
    $.titleAlert("New Message!", {
      //These are here to avoid doing it on focus.
      requireBlur: true,
      stopOnFocus: true,
      //Adjustable values
      duration: 0,
      interval: 700
    });


  });
  //Alerts are called from terminal command line. They open up dialog boxes.
  socket.on('alert', function(notif) {
    var modid = makeid();
    $('body').prepend('<div id="' + modid +
      '" class="reveal-modal" data-reveal aria-labelledby="modalTitle" aria-hidden="true" role="dialog">  <h2 id="modalTitle">Broadcast</h2>  <p class="lead">The system has sent out this broadcast: </p>  <p> ' + notif +
      '</p>  <a class="close-reveal-modal" aria-label="Close">&#215;</a></div>');
    $("#" + modid).foundation('reveal', 'open');
    adjust();
    //Notify about broadcast
    //TODO: Add notification sound and desktop popup
    $.titleAlert("Broadcast from system!", {
      requireBlur: true,
      stopOnFocus: true,
      duration: 0,
      interval: 700
    });
  });

  //Notify about error
  socket.on('error', function(notif) {
    var modid = makeid();
    $('body').prepend('<div id="' + modid +
      '" class="reveal-modal" data-reveal aria-labelledby="modalTitle" aria-hidden="true" role="dialog">  <h2 id="modalTitle">Error!</h2>  <p class="lead">The system sent you this message: </p>  <p> ' + notif +
      '</p>  <a class="close-reveal-modal" aria-label="Close">&#215;</a></div>');
    $("#" + modid).foundation('reveal', 'open');
    adjust();
    //Notify about broadcast
    //TODO: Add notification sound and desktop popup
    $.titleAlert("Broadcast from system!", {
      requireBlur: true,
      stopOnFocus: true,
      duration: 0,
      interval: 700
    });
  });
  //Authentication handling
  socket.on('authentication', function(isAuth) {
    if (isAuth) {
      console.log("Authenticated");
      //Load previous messages
      authenticated = true;
      prevmsg();
    } else {
      console.log("Failed to authenticate");
      var modid = makeid();
      $('body').prepend('<div id="' + modid +
        '" class="reveal-modal" data-reveal aria-labelledby="modalTitle" aria-hidden="true" role="dialog">  <h2 id="modalTitle">Error 401</h2>  <p class="lead">Authorization error </p>  <p> Failed to authenticate with server via handshake. </p>  <a class="close-reveal-modal" aria-label="Close">&#215;</a></div>'
      );
      $("#" + modid).foundation('reveal', 'open');
      setTimeout(function() {
        logout();
      }, 3000);
    }
  });
  socket.on('disconnect', function() {
    var modid = makeid();
    $('body').prepend('<div id="' + modid +
      '" class="reveal-modal" data-reveal aria-labelledby="modalTitle" aria-hidden="true" role="dialog">  <h2 id="modalTitle">Network Failure</h2>  <p class="lead">Connection to server has been lost </p>  <p> Whoops! It seems like the connection to the server was lost. <a href="#" onclick="location.reload()">Try refreshing. </a></p>  <a class="close-reveal-modal" aria-label="Close">&#215;</a></div>'
    );
    $("#" + modid).foundation('reveal', 'open');
  });

  function auth(keys) {
    //Send the keys to the server for validation
    socket.emit('auth', keys);
  }

  function logout() {
    localStorage.username = "";
    localStorage.pass = "";
    location.reload();
  }
  //Typing plugin
  var typing = false;
  var timeout = undefined;

  function timeoutFunction() {
    typing = false;

    var typevar = {
      username: uservar.usr,
      key: uservar.key,
      state: typing
    };
    if (authenticated) {
      socket.emit("typingMessage", typevar);

    }
  }

  $("#m").keydown(function(e) {
    if (e.keyCode == 13) {
      timeoutFunction()
      return true;
    }
    if (typing == false) {
      typing = true

      var typevar = {
        username: uservar.usr,
        key: uservar.key,
        state: typing
      };
      if (authenticated) {
        socket.emit("typingMessage", typevar);
      }
      timeout = setTimeout(timeoutFunction, 1000);
    } else {
      clearTimeout(timeout);
      timeout = setTimeout(timeoutFunction, 1000);
    }

  });

  function showtyping(data) {
    var html = '<div data-alert="" class="alert-box typing a' + data.username.hashCode() + '"> ' + data.name + ' is typing...</div>';
    if (!($(".a" + data.username.hashCode())[0]) && uservar.usr != data) {
      $(".sending").prepend(html);
    }
    adjust();
  }

  function hidetyping(data) {
    if ($(".a" + data.username.hashCode())[0]) {
      $(".a" + data.username.hashCode()).remove();
    }
    adjust();
  }
  socket.on('typing', function(data) {
    isScrolledToBottom = out.scrollHeight - out.clientHeight <= out.scrollTop + 1;

    if (data.username != uservar.usr) {
      showtyping(data);
    }
    if (isScrolledToBottom) {
      out.scrollTop = out.scrollHeight - out.clientHeight;
    }

    adjust();

  });
  socket.on('stoptyping', function(data) {
    hidetyping(data);
    adjust();
  });

  function previewFile() {
    var file = document.querySelector('.upload-space').files[0];
    var reader = new FileReader();

    reader.addEventListener("load", function() {
      var imageobj = {
        user: uservar.usr,
        key: uservar.key,
        data: reader.result
      };

      socket.emit("image", imageobj);
      $('#file-upload').foundation('reveal', 'close');
    }, false);

    if (file) {
      reader.readAsDataURL(file);
    }
  }

  $("#messages").bind("DOMSubtreeModified", function() {
    if (isScrolledToBottom) {
      out.scrollTop = out.scrollHeight - out.clientHeight;
    }
    isScrolledToBottom = out.scrollHeight - out.clientHeight <= out.scrollTop + 1;
    $("img").load(function() {
      if (isScrolledToBottom) {
        out.scrollTop = out.scrollHeight - out.clientHeight;
      }
      isScrolledToBottom = out.scrollHeight - out.clientHeight <= out.scrollTop + 1;
    });
  });
  $("#messages").scroll(function() {
    isScrolledToBottom = out.scrollHeight - out.clientHeight <= out.scrollTop + 1;
  });
  new ResizeSensor(jQuery('#m'), function() {
    if (isScrolledToBottom) {
      out.scrollTop = out.scrollHeight - out.clientHeight;
    }
    isScrolledToBottom = out.scrollHeight - out.clientHeight <= out.scrollTop + 1;
  });
  $('#m').bind('resize', function() {
    if (isScrolledToBottom) {
      out.scrollTop = out.scrollHeight - out.clientHeight;
    }
    isScrolledToBottom = out.scrollHeight - out.clientHeight <= out.scrollTop + 1;
  });
  $(window).load(function() {
    out.scrollTop = out.scrollHeight - out.clientHeight;
  });
  $(window).resize(function() {
    isScrolledToBottom = true;
    out.scrollTop = out.scrollHeight - out.clientHeight;
  });


  //PAste Image Module
  document.getElementById('m').onpaste = function(event) {
    // use event.originalEvent.clipboard for newer chrome versions
    var items = (event.clipboardData || event.originalEvent.clipboardData).items;
    console.log(JSON.stringify(items)); // will give you the mime types
    // find pasted image among pasted items
    var blob = null;
    for (var i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") === 0) {
        blob = items[i].getAsFile();
      }
    }
    // load image if there is a pasted image
    if (blob !== null) {
      var reader = new FileReader();
      reader.onload = function(event) {
        console.log(event.target.result); // data url!
        var imageobj = {
          user: uservar.usr,
          key: uservar.key,
          data: event.target.result
        };

        socket.emit("image", imageobj);
      };
      reader.readAsDataURL(blob);
    }
  }

  //Make everything functional
  $(document).ready(function() {
    //First of all we NEED to authenticate or things will be breaking :/
    //Pass the user object as the key
    auth(uservar);
    //Init foundation (For dialogs, alerts, UI, etc..)
    $(document).foundation();
    //Focus on message input for convinience
    $('#m').focus()
  });
