$("#clear").click(function(e) {
    var query = $("#query");
    query.val('').focus();
    $("#result-count").text('');
    updateLengths();
});

function letterCount() {
    return $("#query").val().replace(/[^a-z]/gi, "").length;
}

// One dropdown per word. The last word's length is whatever letters are
// left over, so it's shown but can't be picked and the lengths always add up.
// Each other dropdown only offers lengths that leave at least one letter for
// every later word, and a choice that no longer fits is lowered.
function updateLengths() {
    var words = Number($("#word-count").val());
    var letters = letterCount();
    $("#lengths-group").toggle(words > 1);
    var lengths = $("#lengths");
    while (lengths.children().length < words) {
        lengths.append($('<select class="form-control form-control-sm mr-1"/>').change(updateLengths));
    }
    while (lengths.children().length > words) {
        lengths.children().last().remove();
    }
    var used = 0;
    lengths.children().each(function(i) {
        var select = $(this);
        var last = i === words - 1;
        // a length that was filled in automatically isn't a choice to keep
        var value = select.data("auto") ? NaN : Number(select.val());
        var max = letters - used - (words - 1 - i);
        select.data("auto", last);
        if (last) {
            value = max;
        } else if (!(value >= 1)) {
            // spread the letters evenly to start with
            value = Math.floor(letters / words);
        }
        value = Math.min(value, max);
        select.empty().prop("disabled", last || letters < words);
        if (letters < words) {
            // not enough letters for this many words
            select.append($("<option/>").val("").text("\u2013"));
            return;
        }
        var first = last ? max : 1;
        for (var n = first; n <= max; n++) {
            select.append($("<option/>").val(n).text(n));
        }
        select.val(Math.max(value, 1));
        used += Number(select.val());
    });
}

$("#word-count").change(updateLengths);

$('input[name=querytype]').change(function(e) {
    $("#anagram-options").toggle(this.value === "anagram");
    updateLengths();
});

$("#query").on("input", function(e) {
    if (this.value.indexOf(" ") === -1) {
        return;
    }
    var pos = this.selectionStart;
    this.value = this.value.replace(/ /g, ".");
    this.setSelectionRange(pos, pos);
});

$("#query").on("input", updateLengths);

$("#go").click(function(e) {
    e.preventDefault();
    var query = $("#query");
    var querytype = $('input[name=querytype]:checked').val();
    var pattern = query.val();
    var url = "https://obbe7hxsnb.execute-api.us-east-1.amazonaws.com/Prod/" + querytype + "?pattern=" + encodeURIComponent(pattern);
    if (querytype === "anagram" && Number($("#word-count").val()) > 1) {
        var lengths = $("#lengths select").map(function() { return Number($(this).val()); }).get();
        if (lengths.some(function(n) { return !(n >= 1); })) {
            alert("There aren't enough letters for " + lengths.length + " words");
            return;
        }
        url = "https://obbe7hxsnb.execute-api.us-east-1.amazonaws.com/Prod/multi-anagram?pattern=" + encodeURIComponent(pattern) +
            "&lengths=" + encodeURIComponent(lengths.join(","));
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

