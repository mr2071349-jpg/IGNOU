// $("#theme-change").click((function () {
//     $("body").hasClass("dark-theme") ? ($("body").removeClass("dark-theme"), setCookie("dark-theme", "")) : ($("body").addClass("dark-theme"), setCookie("dark-theme", "dark-theme"))
// }));
// $("#hide-img").click((function () {
//     $("body").hasClass("hide-img") ? ($("body").removeClass("hide-img"), setCookie("hide-img", "")) : ($("body").addClass("hide-img"), setCookie("hide-img", "hide-img"))
// }));
// $("#highlight").click((function () {
//     $("body").hasClass("highlight") ? ($("body").removeClass("highlight"), setCookie("highlight", "")) : ($("body").addClass("highlight"), setCookie("hide-img", "highlight"))
// }));
// $("#invrt").click((function () {
//     $("body").hasClass("invrt") ? ($("body").removeClass("invrt"), setCookie("invrt", "")) : ($("body").addClass("invrt"), setCookie("invrt", "invrt"))
// }));
// $("#saturate").click((function () {
//     $("body").hasClass("saturate") ? ($("body").removeClass("saturate"), setCookie("saturate", "")) : ($("body").addClass("saturate"), setCookie("saturate", "saturate"))
// }));

// function resetFilters() {

//     $("body").removeClass(
//         "dark-theme hide-img highlight invrt saturate"
//     );

//     /* Reset accessibility button states */
//     $("#theme-change").attr("aria-pressed", "false");
//     $("#invrt").attr("aria-pressed", "false");
//     $("#saturate").attr("aria-pressed", "false");
//     $("#highlight").attr("aria-pressed", "false");
//     $("#hide-img").attr("aria-pressed", "false");

// }

/* =====================================================
   CONTRAST / DARK THEME
===================================================== */

$("#theme-change").on("click", function () {

    if ($("body").hasClass("dark-theme")) {

        $("body").removeClass("dark-theme");

        setCookie("dark-theme", "");

        $(this).attr("aria-pressed", "false");

    } else {

        $("body").addClass("dark-theme");

        setCookie("dark-theme", "dark-theme");

        $(this).attr("aria-pressed", "true");

    }

});


/* =====================================================
   HIDE IMAGES
===================================================== */

$("#hide-img").on("click", function () {

    if ($("body").hasClass("hide-img")) {

        $("body").removeClass("hide-img");

        setCookie("hide-img", "");

        $(this).attr("aria-pressed", "false");

    } else {

        $("body").addClass("hide-img");

        setCookie("hide-img", "hide-img");

        $(this).attr("aria-pressed", "true");

    }

});


/* =====================================================
   HIGHLIGHT LINKS
===================================================== */

$("#highlight").on("click", function () {

    if ($("body").hasClass("highlight")) {

        $("body").removeClass("highlight");

        setCookie("highlight", "");

        $(this).attr("aria-pressed", "false");

    } else {

        $("body").addClass("highlight");

        /* CORRECT COOKIE NAME */
        setCookie("highlight", "highlight");

        $(this).attr("aria-pressed", "true");

    }

});


/* =====================================================
   INVERT
===================================================== */

$("#invrt").on("click", function () {

    if ($("body").hasClass("invrt")) {

        $("body").removeClass("invrt");

        setCookie("invrt", "");

        $(this).attr("aria-pressed", "false");

    } else {

        $("body").addClass("invrt");

        setCookie("invrt", "invrt");

        $(this).attr("aria-pressed", "true");

    }

});


/* =====================================================
   SATURATION
===================================================== */

$("#saturate").on("click", function () {

    if ($("body").hasClass("saturate")) {

        $("body").removeClass("saturate");

        setCookie("saturate", "");

        $(this).attr("aria-pressed", "false");

    } else {

        $("body").addClass("saturate");

        setCookie("saturate", "saturate");

        $(this).attr("aria-pressed", "true");

    }

});


/* =====================================================
   RESET ALL ACCESSIBILITY FILTERS
===================================================== */

function resetFilters() {

    /* ---------------------------------------------
       Remove classes from BODY
    --------------------------------------------- */

    $("body").removeClass(
        "dark-theme hide-img highlight invrt saturate"
    );


    /* ---------------------------------------------
       Clear cookies
    --------------------------------------------- */

    setCookie("dark-theme", "");
    setCookie("hide-img", "");
    setCookie("highlight", "");
    setCookie("invrt", "");
    setCookie("saturate", "");


    /* ---------------------------------------------
       Reset aria-pressed
    --------------------------------------------- */

    $("#theme-change").attr("aria-pressed", "false");
    $("#hide-img").attr("aria-pressed", "false");
    $("#highlight").attr("aria-pressed", "false");
    $("#invrt").attr("aria-pressed", "false");
    $("#saturate").attr("aria-pressed", "false");

}
var fontSize = "body, a, p, label, form-label, span, div, b, i, strong, u, ul, li, h1, h2, h3, h4, h5, h6, table, tr, th, td, button, input, textarea, select, .form-control, form, marquee";

function pageLoad() {
    $(fontSize).each((function (e, t) {
        var o = $(this),
            n = o.css("fontSize");
        if ("" != n && null != n) {
            n = n.replace(/px$/, "");
            var r = parseFloat(n),
                a = (r = parseFloat(getCookie("currentfont")) > 0 ? parseFloat(r) + parseFloat(getCookie("currentfont")) : parseFloat(r) - Math.abs(parseFloat(getCookie("currentfont")))) + "px";
            o.css("fontSize", a)
        }
    }));
    var e = getCookie("dark-theme");
    "" != e ? $("body").addClass(e) : $("body").removeClass(e)
}

function decrAllFontSize() {
    if (isNaN(getCookie("currentfont"))) setCookie("currentfont", -1);
    else {
        if (!(getCookie("currentfont") > -5)) return !1;
        setCookie("currentfont", parseFloat(getCookie("currentfont")) - 1)
    }
    $(fontSize).each((function (e, t) {
        var o = $(this),
            n = o.css("fontSize");
        if ("" != n && null != n) {
            n = n.replace(/px$/, "");
            var r = parseFloat(n),
                a = (r -= 1) + "px";
            o.css("fontSize", a)
        }
    }))
}

function incrAllFontSize() {
    if (isNaN(getCookie("currentfont"))) setCookie("currentfont", 1);
    else {
        if (!(getCookie("currentfont") < 5)) return !1;
        setCookie("currentfont", parseFloat(getCookie("currentfont")) + 1)
    }
    $(fontSize).each((function (e, t) {
        var o = $(this),
            n = o.css("fontSize");
        if ("" != n && null != n) {
            n = n.replace(/px$/, "");
            var r = parseFloat(n),
                a = (r += 1) + "px";
            o.css("fontSize", a)
        }
    }))
}

function orgAllFontSize() {
    isNaN(getCookie("currentfont")) || ($(fontSize).each((function (e, t) {
        var o = $(this),
            n = o.css("fontSize");
        if ("" != n && null != n) {
            n = n.replace(/px$/, "");
            var r = parseFloat(n),
                a = (r = parseFloat(getCookie("currentfont")) > 0 ? parseFloat(r) - parseFloat(getCookie("currentfont")) : parseFloat(r) + Math.abs(parseFloat(getCookie("currentfont")))) + "px";
            o.css("fontSize", a)
        }
    })), setCookie("currentfont", 0))
}

function setCookie(e, t, o = {
    secure: !0,
    "max-age": 36e3
}) {
    (o = {
        path: "/",
        options: o
    }).expires instanceof Date && (o.expires = o.expires.toUTCString());
    let n = encodeURIComponent(e) + "=" + encodeURIComponent(t);
    for (let e in o) {
        n += "; " + e;
        let t = o[e];
        !0 !== t && (n += "=" + t)
    }
    document.cookie = n
}

function getCookie(e) {
    for (var t = e + "=", o = decodeURIComponent(document.cookie).split(";"), n = 0; n < o.length; n++) {
        for (var r = o[n];
            " " == r.charAt(0);) r = r.substring(1);
        if (0 == r.indexOf(t)) return r.substring(t.length, r.length)
    }
    return ""
}
$(document).ready((function () {
    pageLoad()
}));