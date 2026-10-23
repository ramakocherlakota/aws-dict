$("#clear").click(function(e) {
    var query = $("#query");
    query.val('').focus();
    $("#result-count").text('');
});

$('input[name=querytype]').change(function(e) {
    $("#lengths").toggle(this.value === "multi-anagram");
});

$("#query").on("input", function(e) {
    if (this.value.indexOf(" ") === -1) {
        return;
    }
    var pos = this.selectionStart;
    this.value = this.value.replace(/ /g, ".");
    this.setSelectionRange(pos, pos);
});

$("#go").click(function(e) {
    e.preventDefault();
    var query = $("#query");
    var querytype = $('input[name=querytype]:checked').val();
    var pattern = query.val();
    var url = "https://obbe7hxsnb.execute-api.us-east-1.amazonaws.com/Prod/" + querytype + "?pattern=" + encodeURIComponent(pattern);
    if (querytype === "multi-anagram") {
        var lengths = ($("#lengths").val().match(/\d+/g) || []).map(Number);
        var letterCount = pattern.replace(/[^a-z]/gi, "").length;
        var total = lengths.reduce(function(a, b) { return a + b; }, 0);
        if (lengths.length === 0 || total !== letterCount) {
            alert("The word lengths need to add up to the number of letters (" + letterCount + ")");
            return;
        }
        url += "&lengths=" + encodeURIComponent(lengths.join(","));
    }
    var spinner = $('<div/>').css({'margin-left': '10px', 'display': 'inline-block', 'vertical-align': 'middle'}).insertAfter(this).preloader({src:'sprites.32.png'});
    $.ajax({
        type: "GET",
        url: url,
        accepts: "application/json",
        crossDomain: "true",
        success: function (data) {
            spinner.preloader('stop');
            query.val(pattern);
            var results = $("#results");
            results.empty();
            var matches = data['matches'];
            $("#result-count").text((data['truncated'] ? "First " : "") + matches.length + " result" + (matches.length === 1 ? "" : "s"));
            for (var i=0; i<matches.length; i++) {
                var word = matches[i];
                results.append("<li class='list-group-item'><a href='http://www.google.com/search?q="+encodeURIComponent(word)+"' target='_blank'>" + word + "</a></li>");
            }
        },
        error: function (request, status, errorThrown) {
            // show an error message
            spinner.preloader('stop');
            $("#result-count").text('');
            var message = errorThrown;
            if (request.responseJSON && request.responseJSON.error && request.responseJSON.error.message) {
                message = request.responseJSON.error.message;
            }
            alert("An error was encountered " + message);
        }});
});

