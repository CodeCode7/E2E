sap.ui.define([
	"merck/controller/BaseController"
], function(BaseController) {
	"use strict";

	return BaseController.extend("merck.controller.NotFound", {

		/**
		 * Navigates to the worklist when the link is pressed
		 * @public
		 */
		onLinkPressed: function() {
			this.getRouter().navTo("home");
		}

	});

});