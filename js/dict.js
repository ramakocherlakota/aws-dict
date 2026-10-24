$("#clear").click(function(e) {
    var query = $("#query");
    query.val('').focus();
    $("#result-count").text('');
    included = [];
    excluded = [];
    showWordFilters();
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
        // words picked for one puzzle don't carry over to different letters or lengths
        var key = pattern.toLowerCase().replace(/[^a-z]/g, "").split("").sort().join("") + "|" + lengths.join(",");
        if (key !== searchKey) {
            searchKey = key;
            included = [];
            excluded = [];
        }
    }
    currentUrl = url;
    currentPattern = pattern;
    showWordFilters();
    fetchResults(url, pattern, 0);
});

// For multi-word anagrams, words marked as definitely in the answer
// (thumbs up) or not in it (thumbs down) are sent with every request.
var included = [];
var excluded = [];
var searchKey = null;
var currentUrl = null;
var currentPattern = null;

function isMultiAnagram(url) {
    return url.indexOf("/multi-anagram?") !== -1;
}

function wordFilterParams(url) {
    if (!isMultiAnagram(url)) {
        return "";
    }
    return (included.length ? "&include=" + encodeURIComponent(included.join(",")) : "") +
        (excluded.length ? "&exclude=" + encodeURIComponent(excluded.join(",")) : "");
}

function showWordFilters() {
    var filters = $("#word-filters").empty();
    function badges(label, words, list, cls) {
        if (!words.length) {
            return;
        }
        filters.append($("<span class='mr-1'/>").text(label));
        words.forEach(function(word) {
            var badge = $("<span class='badge mr-1'/>").addClass(cls).text(word + " ");
            badge.append($("<a href='#' class='text-white' title='Remove'/>").html("&times;").click(function(e) {
                e.preventDefault();
                list.splice(list.indexOf(word), 1);
                rerun();
            }));
            filters.append(badge);
        });
    }
    badges("Must include:", included, included, "badge-success");
    badges("Ruled out:", excluded, excluded, "badge-danger");
    filters.toggle(included.length + excluded.length > 0);
}

function rerun() {
    showWordFilters();
    fetchResults(currentUrl, currentPattern, 0);
}

function markWord(word, action) {
    [included, excluded].forEach(function(list) {
        var i = list.indexOf(word);
        if (i !== -1) {
            list.splice(i, 1);
        }
    });
    (action === "include" ? included : excluded).push(word);
    rerun();
}

$("#results").on("click", ".word", function(e) {
    e.stopPropagation();
    var position = $(this).offset();
    $("#word-menu").data("word", $(this).text())
        .css({top: position.top + $(this).outerHeight() + 2, left: position.left}).show();
});

$("#word-menu").on("click", "button", function(e) {
    e.stopPropagation();
    var menu = $("#word-menu").hide();
    var word = menu.data("word");
    var action = $(this).data("action");
    if (action === "look") {
        window.open("http://www.google.com/search?q=" + encodeURIComponent(word), "_blank");
    } else {
        markWord(word, action);
    }
});

$(document).on("click", function() {
    $("#word-menu").hide();
}).on("keydown", function(e) {
    if (e.key === "Escape") {
        $("#word-menu").hide();
    }
});

// Multi-word anagrams can have far more matches than fit in one response,
// so they come a page at a time; the count line links to the pages around it.
// Matches the page size in the multi-anagram Lambda.
var PAGE_SIZE = 1000;

function fetchResults(url, pattern, offset) {
    var spinner = $('<div/>').css({'margin-left': '10px', 'display': 'inline-block', 'vertical-align': 'middle'}).insertAfter($("#go")).preloader({src:'sprites.32.png'});
    $.ajax({
        type: "GET",
        url: (offset ? url + "&offset=" + offset : url) + wordFilterParams(url),
        accepts: "application/json",
        crossDomain: "true",
        success: function (data) {
            spinner.preloader('stop');
            $("#query").val(pattern);
            var results = $("#results");
            results.empty();
            var matches = data['matches'];
            showCount(url, pattern, data);
            for (var i=0; i<matches.length; i++) {
                var word = matches[i];
                if (isMultiAnagram(url)) {
                    // each word opens the thumbs up / thumbs down / look up menu
                    var item = $("<li class='list-group-item'/>");
                    word.split(" ").forEach(function(w, j) {
                        if (j) {
                            item.append(" ");
                        }
                        item.append($("<span class='word'/>").text(w).toggleClass("included", included.indexOf(w) !== -1));
                    });
                    results.append(item);
                } else {
                    results.append("<li class='list-group-item'><a href='http://www.google.com/search?q="+encodeURIComponent(word)+"' target='_blank'>" + word + "</a></li>");
                }
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
}

function showCount(url, pattern, data) {
    var count = $("#result-count").empty();
    var n = data['matches'].length;
    var offset = data['offset'] || 0;
    var paged = offset > 0 || data['more'];
    if (!paged) {
        count.text(n + " result" + (n === 1 ? "" : "s"));
    } else {
        count.text("Results " + (n ? (offset + 1) + "\u2013" + (offset + n) : "none past " + offset));
    }
    function pageLink(text, newOffset) {
        return $("<a href='#' class='ml-2'/>").text(text).click(function(e) {
            e.preventDefault();
            fetchResults(url, pattern, newOffset);
            window.scrollTo(0, 0);
        });
    }
    if (offset > 0) {
        count.append(pageLink("\u2039 Previous " + PAGE_SIZE, Math.max(0, offset - PAGE_SIZE)));
    }
    if (data['more']) {
        count.append(pageLink("Next " + PAGE_SIZE + " \u203a", offset + n));
    }
    if (data['timed_out']) {
        count.append($("<span class='ml-2'/>").text("(the search ran out of time, so there may be more)"));
    }
}
