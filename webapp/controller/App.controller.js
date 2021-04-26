sap.ui.define([
	"merck/controller/BaseController",
	"sap/ui/model/json/JSONModel"
], function(BaseController, JSONModel) {
	"use strict";

	return BaseController.extend("merck.controller.App", {

		onInit: function() {
			var oViewModel,
				fnSetAppNotBusy,
				iOriginalBusyDelay = this.getView().getBusyIndicatorDelay();

			oViewModel = new JSONModel({
				busy: true,
				delay: 0
			});
			this.setModel(oViewModel, "appView");

			fnSetAppNotBusy = function() {
				oViewModel.setProperty("/busy", false);
				oViewModel.setProperty("/delay", iOriginalBusyDelay);
			};

			this.getOwnerComponent().getModel().metadataLoaded().
			then(fnSetAppNotBusy);

			// apply content density mode to root view
			this.getView().addStyleClass(this.getOwnerComponent().getContentDensityClass());
			this.getMuid();
		},
		getMuid: function() {
			var userModel = new sap.ui.model.json.JSONModel("/services/userapi/currentUser");
			userModel.loadData("/services/userapi/currentUser", null, false);
			userModel.attachRequestCompleted(function() {

				//not required, but If something should happen after the data is available
			});

			this.getModel("appView").setProperty("/muid", userModel.getProperty("/name"));
			this.getModel("appView").setProperty("/mail", userModel.getProperty("/email"));
			this.getModel("appView").setProperty("/name", userModel.getProperty("/firstName") + " " + userModel.getProperty("/lastName"));
			this.getModel("appView").setProperty("/displayName", userModel.getProperty("/displayName"));
		}

	});

});