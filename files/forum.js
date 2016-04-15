var forumaccess = {
  user: uservar.usr,
  key: uservar.key
};

var forum = false;

$('#forum').on('toggled', function(event, tab) {
  if (!forum) {
    forum = true;
    socket.emit("loadAllThreads", forumaccess);
  }
});

//Bugfix
$('#chat').on('toggled', function(event, tab) {
  adjust();
});



function listThread(poster, title, image, content, id) {
  $(".listing").append('<div class="row singleThread thread-' + id + '"> <div class="column small-12 medium-3 preview-image"><img src="' + htmlEntities(image) + '"></div> <div class="column small-12 medium-8 end preview-content"> <h2>' + htmlEntities(title) + '</h2> <h4>By: ' + htmlEntities(poster) + '</h4> <p>' + htmlEntities(content.substring(0,50)) + '... </p> <ul class="button-group"> <li><a href="#" onclick="loadThread(\'' + id + '\')" class="button small">Full View</a></li></ul> </div> </div><hr>');
  $(".preview-image").unbind("click");
  $(".preview-image").click(function() {
    $(this).toggleClass("medium-3");
  });
}
function newThread(poster, title, image, content, id) {
  $(".listing").prepend('<div class="row singleThread thread-' + id + '"> <div class="column small-12 medium-3 preview-image"><img src="' + htmlEntities(image) + '"></div> <div class="column small-12 medium-8 end preview-content"> <h2>' + htmlEntities(title) + '</h2> <h4>By: ' + htmlEntities(poster) + '</h4> <p>' + htmlEntities(content.substring(0,50)) + '... </p> <ul class="button-group"> <li><a href="#" onclick="loadThread(\'' + id + '\')" class="button small">Full View</a></li></ul> </div> </div><hr>');
  $(".preview-image").unbind("click");
  $(".preview-image").click(function() {
    $(this).toggleClass("medium-3");
  });
}

socket.on('new thread', function(data) {
  newThread(data.poster, data.title, data.image, data.content, data.id);
});
function loadThread(id){
  $("#forumtablink").click();
  var loadobj = forumaccess;
  loadobj.id = id;
  socket.emit("loadSingleThread", loadobj);
  $("#openThread a").click();
  $(".openThread").addClass("loading");
  $(".openThread").attr("id","t" + id);
  $("#open-thread").addClass("selected");
  $(".openThread").data("id", id);
}

function deleteThread(id){
  var delobj = forumaccess;
  delobj.id = id;
  socket.emit("delete thread", delobj);
}

function openThread(user, poster, title, image, content, id) {
  var opt;
  if (user == forumaccess.user){
    opt = " <a onclick=\"deleteThread('" + id + "')\">[Delete]</a>";
  }
  $(".openThread").html('<div class="row singleThread"> <div class="column small-12 medium-3 preview-image"><img src="' + htmlEntities(image) + '"></div> <div class="column small-12 medium-8 end preview-content"> ' + opt + ' <h2>' + htmlEntities(title) + '</h2> <h4>By: ' + htmlEntities(poster) + '</h4> <p>' + htmlEntities(content) + ' </p> </div> </div><hr>');
  $(".preview-image").unbind("click");
  $(".preview-image").click(function() {
    $(this).toggleClass("medium-3");
  });
  $(".openThread").removeClass("loading");
  $("#open-thread .preview-content p").each(function() {
    $(this).html(function(index, text) {
        return text.replace(/\n/g,"<br>");
    });
});
}
function reply(user, poster, title, image, content, id) {
  $(".openThread").append('<div class="row singleThread"> <div class="column small-12 medium-3 preview-image"><img src="' + htmlEntities(image) + '"></div> <div class="column small-12 medium-8 end preview-content"> <h2>' + htmlEntities(title) + '</h2> <h4>By: ' + htmlEntities(poster) + '</h4> <p>' + htmlEntities(content) + ' </p> </div> </div><hr>');
  $(".preview-image").unbind("click");
  $(".preview-image").click(function() {
    $(this).toggleClass("medium-3");
  });
  $(".openThread").removeClass("loading");

  $("#open-thread .preview-content p").each(function() {
    $(this).html(function(index, text) {
        return text.replace(/\n/g,"<br>");
    });
});
}
socket.on('open thread', function(data) {
  console.log("Thread Opened", data);
  data.forEach(function(element, index, array){
    if (element.value.type=="thread"){
      openThread(element.value.user, element.value.poster, element.value.title, element.value.image, element.value.content, element.path.key);
    } else {
      reply(element.value.user, element.value.poster, element.value.title, element.value.image, element.value.content, element.path.key);
    }
  })

});
socket.on('thread deleted', function(data) {
  $("#t10d0c2ff1d02573a, .thread-10d0c2ff1d02573a").html("<h2>Thread Deleted</h3>")
});
socket.on('Thread List', function(data) {
  console.log("Got Thread List!", data);
  $(".listing").html("");
  data.forEach(function(element, index, array) {
    var data = element.value;
    data.id = element.path.key;
    listThread(data.poster, data.title, data.image, data.content, data.id);
  });
  $(".listing").removeClass("loading");
});
$("dd").click(function() {
  $("dd").removeClass("active");
  $(this).addClass("active");
  var loadobj = forumaccess;
  loadobj.filter = $(this).data("filter");
  $(".listing").addClass("loading");
  socket.emit("loadFilterThreads", loadobj);
});

//Post thread
function removepostimg(){
    $(".forumupload").html('<div class="uimgurl"></div><input type="file" class="upload-space2" onchange="previewFile2()">');
}
socket.on('forumimg', function(data) {
  $(".forumupload").html("<h2>Image Uploaded!</h2><br><h3 class='uimgurl'>" + data + "</h3><h3><a onclick='removepostimg()'>[Remove]</a></h3>");
});

function previewFile2() {
  $(".forumupload").append("<img src='/files/loader.gif'>");
  var file = document.querySelector('.upload-space2').files[0];
  var reader = new FileReader();

  reader.addEventListener("load", function() {
    var imageobj = {
      user: uservar.usr,
      key: uservar.key,
      data: reader.result
    };

    socket.emit("image2url", imageobj);
  }, false);

  if (file) {
    reader.readAsDataURL(file);
  }
}

function doPost() {

  var postObj = {
    user: uservar.usr,
    key: uservar.key,
    post: {
      "image": $(".uimgurl").text(),
      "user": uservar.usr,
      "title": $(".postTitle").val(),
      "content": $(".postContent").val(),
      "cat": $(".catforum").val(),
      "type": "thread"
    }
  }
  if (!(postObj.post.title == "")) {
    socket.emit("postThread", postObj);
    $('form').trigger('reset');
    removepostimg2()
    $("#browse").click();
  } else {
    alert("Title is missing!");
  }

}
//Post reply
function removepostimg2(){
    $(".forumupload3").html('<div class="uimgurl"></div><input type="file" class="upload-space3" onchange="previewFile3()">');

    $("#open-thread .preview-content p").each(function() {
      $(this).html(function(index, text) {
          return text.replace(/\n/g,"<br>");
      });
  });
}
socket.on('postimg', function(data) {
  $(".forumupload3").html("<h2>Image Uploaded!</h2><br><h3 class='uimgurl2'>" + data + "</h3><h3><a onclick='removepostimg2()'>[Remove]</a></h3>");
});
socket.on('new reply', function(data) {
  $("#t" + data.replyto).append('<div class="row singleThread"> <div class="column small-12 medium-3 preview-image"><img src="' + htmlEntities(data.image) + '"></div> <div class="column small-12 medium-8 end preview-content"> <h2>' + htmlEntities(data.title) + '</h2> <h4>By: ' + htmlEntities(data.poster) + '</h4> <p>' + htmlEntities(data.content) + ' </p> </div> </div><hr>');
  $(".preview-image").unbind("click");
  $(".preview-image").click(function() {
    $(this).toggleClass("medium-3");
  });

  $("#open-thread .preview-content p").each(function() {
    $(this).html(function(index, text) {
        return text.replace(/\n/g,"<br>");
    });
});
});
function previewFile3() {
  $(".forumupload3").append("<img src='/files/loader.gif'>");
  var file = document.querySelector('.upload-space3').files[0];
  var reader = new FileReader();

  reader.addEventListener("load", function() {
    var imageobj = {
      user: uservar.usr,
      key: uservar.key,
      data: reader.result
    };

    socket.emit("image2url2", imageobj);
  }, false);

  if (file) {
    reader.readAsDataURL(file);
  }
}

function doReply() {

  var postObj = {
    user: uservar.usr,
    key: uservar.key,
    post: {
      "image": $(".uimgurl2").text(),
      "user": uservar.usr,
      "title": $(".postTitle2").val(),
      "content": $(".postContent2").val(),
      "replyto": $(".openThread").data("id"),
      "type": "reply"
    }
  }
  if (!(postObj.post.image == "" && postObj.post.title == "" && postObj.post.content == "")) {
    socket.emit("postReply", postObj);
    removepostimg2()
    $('form').trigger('reset');
  } else {
    alert("Post is empty!");
  }

}
