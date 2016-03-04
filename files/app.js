function showimage(isrc) {
  $('.imgcontainer').html("<img src='" + isrc + "'>")
  $('#image-modal').foundation('reveal', 'open');

}
var out = document.getElementById("messages");
// allow 1px inaccuracy by adding 1
var isScrolledToBottom = out.scrollHeight - out.clientHeight <= out.scrollTop + 1;


//Thing to detect focus
var isActive = true;
var authenticated = false;
window.onfocus = function() {
  isActive = true;
};

window.onblur = function() {
  isActive = false;
};

//Events for API
//TODO: Complete API
function NewMsg(obj) {
  var evt = new CustomEvent('OnMsg', {
    name: obj.user,
    msg: obj.msg
  });

  window.dispatchEvent(evt);
}

//Example to handle event:
window.addEventListener('OnMsg', function(e) {
  if (!isActive) {
    play_beep();

    // request permission on page load
    document.addEventListener('DOMContentLoaded', function() {
      if (Notification.permission !== "granted")
        Notification.requestPermission();
    });

    function notifyMe() {
      if (!Notification) {
        return;
      }

      if (Notification.permission !== "granted")
        Notification.requestPermission();
      else {
        var notification = new Notification('New Message!', {
          icon: 'http://www.iconsdb.com/icons/preview/caribbean-blue/message-2-xxl.png',
          body: e.name + ": " + e.msg,
        });

      }

    }

  }
});


//Utilities
//Create links
function createlinks() {
  $('.msgtxt').each(function() {
    // Get the content
    var str = $(this).html();
    // Set the regex string
    var regex = /(https?:\/\/([-\w\.]+)+(:\d+)?(\/([\w\/_\.]*(\?\S+)?)?)?)/ig
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
  var totalh = $("body").outerHeight();
  var inputheight = $(".sending").outerHeight();
  var alerth = 45;
  var messageh = $("#messages").height(totalh - inputheight - alerth);
  //Add .you class to owners' messages
  $(".u" + uservar.usr.hashCode()).addClass('you');


}

//Load previous messages
function prevmsg() {
  console.log("Downloading messages");
  $.get("/previous/" + uservar.usr + "/" + uservar.key, function(data) {
    $("#messages").html(data);
    adjust();
    console.log("Downloaded messages");

    createlinks();
    $(".image").on('click', function(e) {
      showimage($(this).attr('src'));
    });
  });
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
socket.on('chat message', function(obj) {
  //Trigger Event
  NewMsg(obj);
  /*
  The message container will get appending a message with the
  class of the sender which will be later associated with the
  .you class if the client is the originator in order to be
  moved to the right side. The user class is hashed and
  started by "u" in order to be a valid CSS class.
  The contents of the message between <li> tags will be escaped
  to prevent undesired styling by users.
  */

  $('#messages').append($('<li class="msgtxt u' + obj.user.hashCode() + '">').text(obj.name + ": " + obj.msg));

  //Adjust again just to make sure.
  //This function also calls to add relevant classes
  createlinks();
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
socket.on('image', function(obj) {

  console.log($('#messages').outerHeight());
  $('#messages').append($('<li class="msgimg u' + obj.user.hashCode() + '">').html(obj.name + ": <img class='image' src='" + obj.data + "'>"));

  //Adjust again just to make sure.
  //This function also calls to add relevant classes
  createlinks();
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
  var file = document.querySelector('input[type=file]').files[0];
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

$("body").bind("DOMSubtreeModified", function() {
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
