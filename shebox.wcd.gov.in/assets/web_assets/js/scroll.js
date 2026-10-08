// JavaScript Document

$(document).ready(function () {

    $(window).scroll(function () {
        if ($(this).scrollTop() > 700) {
            $('.scroll-top').fadeIn();
			
        } else {
            $('.scroll-top').fadeOut();
			
        }
    });

    $('.scroll-top a').click(function () {
        $("html, body").animate({
            scrollTop: 0
        }, 4000);
        return false;
    });

});

function myFunction(a){a.classList.toggle("change")};
var sidebar = document.getElementById('course-left');
// Stickyfill.add(sidebar);
