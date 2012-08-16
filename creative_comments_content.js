/**
 * The object that will be inserted in the content.
 *
 * @author Tijs Verkoyen
 */
creativeCommentsContent = {
	debug: true,
	clickedElement: null,

	init: function()
	{
		document.addEventListener('mousedown', creativeCommentsContent.click, true);

        chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
			try
			{
				response = eval(request + '(request, sender);');
				sendResponse(response);
			}
			catch(e)
			{
				if(creativeCommentsContent.debug) console.log(e);
			}
		});
	},

	click: function(e) {
		// store the element only when a right click is triggered
		if(e.button == 2) creativeCommentsContent.clickedElement = e.target;
	},

	getClickedItem: function()
	{
		// return the id, when we use the full object an error is triggered.
		return {"id": creativeCommentsContent.clickedElement.id};
	},

	setContent: function(id, content)
	{
		$('#' + id).val(content);

		// @todo    check with defv

		// @todo    submit the form
	},

	removeForm: function()
	{
		// remove the form if it already exists
		$('#creativeCommentsHolder').remove();
	},

	showForm: function(id)
	{
		// remove previous
		creativeCommentsContent.removeForm();

		// build html
		var html = '<div id="creativeCommentsHolder">'+
		           '    <h1>Creative Comments</h1>' +
		           '    <form method="POST" name="creativeCommentsForm" id="creativeCommentsForm">' +
		           '        <p>' +
		           '            <label for="text">Tekst</label>' +
		           '            <textarea name="text" id="text"></textarea>' +
		           '        </p>' +
		           '        <p>' +
		           '            <input type="submit" value="save" />' +
		           '        </p>' +
		           '    </form>' +
		           '</div>';

		// append the HTML
		$('body').append(html);

		// init some vars
		var $creativeCommentsHolder = $('#creativeCommentsHolder');
		var $creativeCommentsForm = $('#creativeCommentsForm');

		// bind events
		$creativeCommentsForm.on('submit', creativeCommentsContent.submitForm);
	},

	submitForm: function(e)
	{
		// prevent default behaviour
		e.preventDefault();

		var data = $('#creativeCommentsForm').serialize();

		$.ajax({
			type: 'POST',
			url: 'http://testing.verkoyen.eu/log.php',
			data: data,
			success: function(data, textStatus, jqXHR) {
				console.log(data);
				console.log(textStatus);
				console.log(jqXHR);

				// remove the form
				creativeCommentsContent.removeForm();

				// build message
				var message = "Bekijk mijn volledige reactie via: http://www.foobar.be";

				// set content
				creativeCommentsContent.setContent(creativeCommentsContent.clickedElement.id, message);
			},
			error: function(jqXHR, textStatus, errorThrown){
				console.log(jqXHR);
				console.log(textStatus);
				console.log(errorThrown);
			}
		});
	}
}

creativeCommentsContent.init();
