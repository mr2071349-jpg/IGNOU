// On Click Sidebar and Arrow Toggle Class Functions

$(document).ready(function () {
    $("#sidebarCollapse").on('click', function () {
        $("#sidebar").toggleClass('active');
    });
    $(".arrowClick").on('click', function () {
        var classExists = $(this).hasClass('slide-arrowClicked');
        if (classExists == false) {
            $(".arrowClick").addClass('slide-arrowClicked');
        } else {
            $(".arrowClick").removeClass('slide-arrowClicked');
        }
    });
    $("#sidebarCollapse2").on('click', function () {
        $("#sidebar").toggleClass('active');
    });

    //mobile-menu-hide
    function isMobile() {
        return window.matchMedia("(max-width: 768px)").matches;
    }
    if (isMobile()) {
        $("#wrapper-level2").on('click', function(event) {
            var opened = $("#sidebar").hasClass("active");
            if (opened === true) {
                $("#sidebar").removeClass('active');
            }
        });
    }
    //mobile-menu-hide

    $("#mainSidebar").on('click', function () {
        $("#sidebar").toggleClass('active');
    });
    $("#sidebarCollapse3").on('click', function () {
        $(".toggleCol").toggleClass('col-lg-12');
        $("#sidebar-wrapper-level2").toggleClass('d-none');
    });
    $("#sidebarCollapse4").on('click', function () {
        $(".toggleCol").toggleClass('col-lg-12');
        $("#sidebar-wrapper-level2").toggleClass('d-none');
    });
    $("#searchClick").on('click', function () {
        $("#site-search").focus();
    });
    $("#logoutClick").on('click', function () {
        $("#site-logout").click();
    });
    $(".menu-toggle").on('click', function (e) {
        alert("Shift + E shortcut combination - Logout");
        e.preventDefault();
        $("#wrapper-level2").toggleClass("toggled");
    });
});

// Keyboard Shortcuts

document.onkeyup = function (e) {
    if (e.altKey && e.which == 69) {
        //alert("Shift + E shortcut combination - Logout");
        $("#site-logout").click();
    } else if (e.altKey && e.which == 187) {
        //alert("Alt + + shortcut combination - Increase Text Size");
        $("#increasetext").click();
    }else if (e.altKey && e.which == 189) {
        //alert("Alt + - shortcut combination - Decrease Text Size");
        $("#decreasetext").click();
    }else if (e.altKey && e.which == 48) {
        //alert("Alt + 0 shortcut combination - Reset Text Size");
        $("#resettext").click();
    }  else if (e.altKey && e.which == 83) {
        //alert("Shift + S shortcut combination - Search");
        $("#site-search").focus();
    } else if (e.altKey && e.which == 75) {
        //alert("Shift + K shortcut combination - Toggle Main Sidebar");
        $("#sidebar").toggleClass('active');
    } else if (e.altKey && e.which == 186) {
        //alert("Shift + ; shortcut combination - Toggle Inner Sidebar");
        $(".toggleCol").toggleClass('col-lg-12');
        $("#sidebar-wrapper-level2").toggleClass('d-none');
    }
};

// Increase/Decrease font size

var $affectedElements = $("li, table, .card, button, p, span, img, h1, h2, h3, h4, h5, h6"); // Can be extended, ex. $("div, p, span.someClass")

// Storing the original size in a data attribute so size can be reset
$affectedElements.each( function(){
    var $this = $(this);
    $this.data("orig-size", $this.css("font-size") );
});

$("#increasetext").click(function(){
    changeFontSize(1.5);
})

$("#decreasetext").click(function(){
    changeFontSize(-1);
})

$("#resettext").click(function(){
    $affectedElements.each( function(){
        var $this = $(this);
        $this.css( "font-size" , $this.data("orig-size") );
    });
})

function changeFontSize(direction){
    $affectedElements.each( function(){
        var $this = $(this);
        $this.css( "font-size" , parseInt($this.css("font-size"))+direction );
    });
}

$('#toggle_fullscreen').on('click', function(){
    // if already full screen; exit
    // else go fullscreen
    if (document.fullscreenElement) {
        document.exitFullscreen();
    } else {
        $('.inner-content').get(0).requestFullscreen();
    }
});

function copyFunction() {
    var copyText = document.getElementById("copyContent");
    var range = document.createRange();
    range.selectNode(copyText);
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);
    document.execCommand("copy");
    window.getSelection().removeAllRanges();
    var copiedText = copyText.textContent.replace(/[\s\r\n]+/g, ""); // Remove all whitespace, line breaks, and carriage returns
    if (!document.fullscreenElement && !document.webkitFullscreenElement && !document.mozFullScreenElement && !document.msFullscreenElement) {
        alert("Copied to clipboard : " + copiedText);
    }
}