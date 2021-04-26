sap.ui.define([
	"merck/controller/BaseController",
	"sap/ui/model/json/JSONModel"
], function(BaseController, JSONModel) {
	"use strict";

	return BaseController.extend("merck.controller.Home", {

		onInit: function() {
			var oViewModel = new JSONModel({
				HomeTableTittle: this.getResourceBundle().getText("HomePageTitle")
			});
			this.setModel(oViewModel, "homeView");
			var oVizFrame = this.oVizFrame = this.getView().byId("idVizFrame");
			oVizFrame.setVizProperties({
				plotArea: {
					dataLabel: {
						visible: true
					},
					dataShape: {
						primaryAxis: ["line", "bar", "bar"]
					}
				},
				valueAxis: {
					title: {
						visible: true
					}
				},
				categoryAxis: {
					title: {
						visible: true
					}
				},
				title: {
					visible: false,
					text: "Trend(30 days)"
				}
			});
			var oPopOver = this.getView().byId("idPopOver");
			oPopOver.connect(oVizFrame.getVizUid());
			var scales = [{
				"feed": "color",
				"palette": ["#0056b1", "#0d066b", "#4bb100"]
			}];
			oVizFrame.setVizScales(scales);

		},
		onPress: function(oEvent) {
			this.getRouter().navTo("wlstatus", {
				status: oEvent.getSource().getBindingContext().getProperty("BackOfficeStatus")

			});

		},
		onUpdateFinished: function() {
			var today = new Date();
			var dd = today.getDate();
			var mm = today.getMonth() + 1; //January is 0!
			var yyyy = today.getFullYear();

			if (dd < 10) {
				dd = '0' + dd
			}

			if (mm < 10) {
				mm = '0' + mm
			}

			today = dd + '.' + mm + '.' + yyyy;

			var sTitle = this.getResourceBundle().getText("HomePageTitle");
			var sdate = sTitle + today;
			this.getModel("homeView").setProperty("/HomePageTitle", sdate);

		},
		onRowPress: function(oEvent) {
			var txtCountry = oEvent.getSource().getBindingContext().getProperty("Country");
			this.getRouter().navTo("wltable", {
				colval: txtCountry,
				odataparam1: "Country",
				odataparam2: "X"

			});
		},
		onPressCountry: function(oEvent) {
			var txtCountry = oEvent.getSource().getProperty("text");
			this.getRouter().navTo("wltable", {
				colval: txtCountry,
				odataparam1: "Country",
				odataparam2: "X"

			});
		},
		onPressCompanyCode: function(oEvent) {
			var txtCompanyCode = oEvent.getSource().getProperty("text");
			this.getRouter().navTo("wltable", {
				colval: txtCompanyCode,
				odataparam1: "CompanyCode",
				odataparam2: "Y"
			});
		},
		onPressOpen: function(oEvent) {
			var txtCompanyCode = oEvent.getSource().getBindingContext().getObject().CompanyCode;
			this.getRouter().navTo("wltable", {
				colval: txtCompanyCode,
				odataparam1: "CompanyCode",
				odataparam2: "Open"
			});
		},
		onPressInProgress: function(oEvent) {
			var txtCompanyCode = oEvent.getSource().getBindingContext().getObject().CompanyCode;
			this.getRouter().navTo("wltable", {
				colval: txtCompanyCode,
				odataparam1: "CompanyCode",
				odataparam2: "In Progress"
			});
		},
		onPressDone: function(oEvent) {
			var txtCompanyCode = oEvent.getSource().getBindingContext().getObject().CompanyCode;
			this.getRouter().navTo("wltable", {
				colval: txtCompanyCode,
				odataparam1: "CompanyCode",
				odataparam2: "Done"
			});
		}

	});

});