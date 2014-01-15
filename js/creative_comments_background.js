/**
 * The object that will live in the background, it wil create and handle the context-menu's.
 *
 * @author Tijs Verkoyen <tijs@sumocoders.be>
 */
creativeCommentsBackground = {
    id: null,

    init: function()
    {
        creativeCommentsBackground.createContextMenu();

        /**
         * Listen to message from content to catch the actions
         */
        chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
            if (request.copyToClipboard) {
                creativeCommentsBackground.copyToClipboard(request.copyToClipboard);
            }
            if (request.showForm) {
                creativeCommentsBackground.click(null, sender.tab);
            }
            if (request.editForm && request.editData) {
                creativeCommentsBackground.click({edit: true, editData: request.editData}, sender.tab);
            }
        });

    },

    click: function(info, tab)
    {
        chrome.tabs.sendRequest(
            tab.id,
            'creativeCommentsContent.isAllowedUrl',
            function(data) {
                if (data.allowed) {
                    // on click we should ask our content.js-files which item was clicked
                    chrome.tabs.sendRequest(
                        tab.id,
                        'creativeCommentsContent.getClickedItem',
                        function(data)
                        {
                            if(info && info.edit && info.editData) {
                                // show the edit form
                                chrome.tabs.executeScript(
                                    tab.id,
                                    { code: 'creativeCommentsContent.editForm("' + data.id + '", ' + JSON.stringify(info.editData)  + ')' }
                                );
                            } else {
                                // show the form
                                chrome.tabs.executeScript(
                                    tab.id,
                                    { code: 'creativeCommentsContent.openForm("' + data.id + '")' }
                                );
                            }
                        }
                    );
                }
                else {
                    alert('At this moment you can not create a Creative Comment outside Facebook.com, Twitter.com or Hootsuite.com.');
                }
            }
        );
    },

    createContextMenu: function()
    {
        // create the context menu
        creativeCommentsBackground.id = chrome.contextMenus.create({
            'title':    'Creative Comments',
            'contexts': ['editable'],
            'onclick':  creativeCommentsBackground.click
        });
    },

    /**
     * Puts the given text in clipboard
     * @param text
     */
    copyToClipboard: function(text) {
        var textarea = document.getElementById('clipboard');
        textarea.innerHTML = text;
        textarea.select();
        document.execCommand('Copy', false, null);
    }

}

creativeCommentsBackground.init();
