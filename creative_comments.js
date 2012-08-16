// Copyright (c) 2010 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

creativeComments = {
	id: null,

	init: function()
	{
		creativeComments.createContextMenu();
	},

	click: function(info, tab) {
		console.log(info);
		console.log(tab);
	},

	createContextMenu: function() {
		creativeComments.id = chrome.contextMenus.create({
			"title": "Creative Comments",
			"contexts": ["editable"],
			"onclick": creativeComments.click
		});
	}
}

creativeComments.init();