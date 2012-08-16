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
		var $textarea = document.getElementById(id);
		$textarea.value = content;

		// @todo    submit the form
	},

	removeForm: function()
	{
		// remove the form if it already exists
		var $creativeCommentsHolder = document.getElementById('creativeCommentsHolder');
		if($creativeCommentsHolder != null) document.removeChild(document.getElementById('creativeCommentsHolder'));
	},

	showForm: function(id)
	{
		// remove previous
		creativeCommentsContent.removeForm();

		// build html
		var html = '<div id="creativeCommentsHolder">'+
		           '    <h1>Creative Comments</h1>' +
		           '    <form method="POST" name="creativeCommentsForm" id="creativeCommentsForm" onsubmit="submitForm()">' +
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
		document.body.innerHTML += html;

		// init some vars
		var $creativeCommentsHolder = document.getElementById('creativeCommentsHolder');
		var $creativeCommentsForm = document.getElementById('creativeCommentsForm');

		//var message = "Bekijk mijn volledige reactie via: http://www.foobar.be, [typ iets anders werkt het niet]";
		// set content @remark for some reason you have to type something otherwise you can't submit the form
		//creativeCommentsContent.setContent(id, message);
	},

	submitForm: function(e) {
		console.log('juij...');
		return false;
	}
}

creativeCommentsContent.init();

function submitForm()
{
	alert('VIEZE HOER');
	return false;
}
