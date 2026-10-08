
$(document).ready(function() {
  var formFields = $('.form-field');
  
  formFields.each(function() {
    var field = $(this);
    var input = field.find('input');
	var textarea = field.find('textarea');
	var select1 = field.find('select');
    var label = field.find('label');
    
    function checkInput() {
      var valueLength = input.val().length;
      
      if (valueLength > 0 ) {
        label.addClass('freeze')
		input.css("border-color", "#1081bf");
      } else {
            label.removeClass('freeze')
			input.css("border-color", "#e5e4a3");
      }
    }
    
    input.change(function() {
      checkInput()
    })
	
	function checkTextarea() {
	  var valueLength = textarea.val().length;
      
      if (valueLength > 0 ) {
        label.addClass('freeze')
		textarea.css("border-color", "#1081bf");
      } else {
            label.removeClass('freeze')
			textarea.css("border-color", "#e5e4a3");
      }
    }
    
    textarea.change(function() {
      checkTextarea()
    })
	
	function checkSelect() {
	  var valueLength = select1.val().length;
      if (valueLength > 0 ) {
        label.addClass('freeze')
		select1.css("border-color", "#1081bf");
      } else {
            label.removeClass('freeze')
			select1.css("border-color", "#e5e4a3");
      }
    }
    
    select1.change(function() {
      checkSelect()
    })
	
	
  });
});

$(document).ready(function(){
$(".updates-outer p").text(function(index, currentText) {
  var maxLength = $(this).attr('data-maxlength');
  if(currentText.length >= maxLength) {
    return currentText.substr(0, maxLength) + "...";
  } else {
    return currentText
  } 
});
});

