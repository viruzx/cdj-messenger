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

var forumaccess = {
  user: uservar.usr,
  key: uservar.key
};


function listThread(poster, title, image, content, id) {
  $( ".listing" ).append( '<div class="row singleThread"> <div class="column small-12 medium-3 preview-image"><img src="' + image + '"></div> <div class="column small-12 medium-8 end preview-content"> <h2>' + title + '</h2> <h4>By: ' + poster + '</h4> <p>' + content + ' </p> <ul class="button-group"> <li><a href="#" class="button small">Full View</a></li></ul> </div> </div>' );
}

socket.on('Thread List', function(data) {
  data.forEach(function(element, index, array) {
    var data = element.value;
    listThread(data.poster, data.title, data.image, data.content, data.id);
  });
  $(".preview-image").click(function() {
    $(this).toggleClass("medium-3");
  });
  $(".listing").removeClass("loading");
});
$("dd").click(function() {
  $("dd").removeClass("active");
  $(this).addClass("active");
});
