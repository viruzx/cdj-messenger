
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
  $(".listing").prepend('<div class="row singleThread"> <div class="column small-12 medium-3 preview-image"><img src="' + image + '"></div> <div class="column small-12 medium-8 end preview-content"> <h2>' + title + '</h2> <h4>By: ' + poster + '</h4> <p>' + content + ' </p> <ul class="button-group"> <li><a href="#" class="button small">Full View</a></li></ul> </div> </div><hr>');

  $(".preview-image").click(function() {
    $(this).toggleClass("medium-3");
  });
}
socket.on('new thread', function(data) {
  listThread(data.poster, data.title, data.image, data.content, data.id);
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
socket.on('forumimg', function(data) {
  $(".forumupload").html("<h2>Image Uploaded!</h2><br><h3 class='uimgurl'>" + data + "</h3>");
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

function doPost(){

  var postObj = {
    user: uservar.usr,
    key: uservar.key,
    post: {
      "image": $(".uimgurl").text(),
      "poster": uservar.usr,
      "title": htmlEntities($(".postTitle").val()),
      "content": htmlEntities($(".postContent").val()),
      "cat": $(".catforum").val(),
      "type": "thread"
    }
  }
  if (!(postObj.post.image == "" && postObj.post.title == "" && postObj.post.content=="")){
    socket.emit("postThread", postObj);
    $("#browse").click();
  } else {
    alert("Post is empty!");
  }

}
