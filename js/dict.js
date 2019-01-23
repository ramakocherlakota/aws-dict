$(".go").click(function(e) {
    var query = $("#query");
    var querytype = $('input[name=querytype]:checked').val();
    var url = "https://obbe7hxsnb.execute-api.us-east-1.amazonaws.com/Prod/" + querytype + "?pattern=" + query.val();

    $.preloader.start();
    $.ajax({
        type: "GET",
        url: url,
        accepts: "application/json",
        crossDomain: "true",
        success: function (data) {
            $.preloader.stop();
            var results = $("#results");
            results.empty();
            var matches = data['matches'];
            for (var i=0; i<matches.length; i++) {
                var word = matches[i];
                results.append("<li class='list-group-item'><a href='http://www.google.com/search?q="+word+"' target='_blank'>" + word + "</a></li>");
            }
        },
        error: function (request, status, errorThrown) {
            // show an error message
            $.preloader.stop();
            alert("An error was encountered " + errorThrown);
        }});
});
