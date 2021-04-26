/*global location*/
sap.ui.define([
	"merck/controller/BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/ui/core/routing/History",
	"merck/model/formatter",
	"sap/ui/core/format/DateFormat"
], function(
	BaseController,
	JSONModel,
	History,
	formatter,
	DateFormat
) {
	"use strict";

	return BaseController.extend("merck.controller.Object", {

		formatter: formatter,

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		/**
		 * Called when the worklist controller is instantiated.
		 * @public
		 */
		onInit: function() {
			// Model used to manipulate control states. The chosen values make sure,
			// detail page is busy indication immediately so there is no break in
			// between the busy indication for loading the view's meta data
			var iOriginalBusyDelay,
				oViewModel = new JSONModel({
					busy: true,
					delay: 0
				});

			this.getRouter().getRoute("object").attachPatternMatched(this._onObjectMatched, this);

			// Store original busy indicator delay, so it can be restored later on
			iOriginalBusyDelay = this.getView().getBusyIndicatorDelay();
			this.setModel(oViewModel, "objectView");
			this.getOwnerComponent().getModel().metadataLoaded().then(function() {
				// Restore original busy indicator delay for the object view
				oViewModel.setProperty("/delay", iOriginalBusyDelay);
			});
		},

		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */

		/**
		 * Event handler  for navigating back.
		 * It there is a history entry we go one step back in the browser history
		 * If not, it will replace the current entry of the browser history with the worklist route.
		 * @public
		 */
		onNavBack: function() {
			var sPreviousHash = History.getInstance().getPreviousHash();

			if (sPreviousHash !== undefined) {
				history.go(-1);
			} else {
				this.getRouter().navTo("worklist", {}, true);
			}
			this.getView().getModel().refresh();
		},

		/* =========================================================== */
		/* internal methods                                            */
		/* =========================================================== */

		/**
		 * Binds the view to the object path.
		 * @function
		 * @param {sap.ui.base.Event} oEvent pattern match event in route 'object'
		 * @private
		 */
		_onObjectMatched: function(oEvent) {

			var sObjectId = oEvent.getParameter("arguments").objectId;
			this.getModel().metadataLoaded().then(function() {
				var sObjectPath = this.getModel().createKey("ReconciliationReport", {
					ReportID: sObjectId
				});
				this._bindView("/" + sObjectPath);
			}.bind(this));

		},

		/**
		 * Binds the view to the object path.
		 * @function
		 * @param {string} sObjectPath path to the object to be bound
		 * @private
		 */
		_bindView: function(sObjectPath) {
			var oViewModel = this.getModel("objectView"),
				oDataModel = this.getModel();

			this.getView().bindElement({
				path: sObjectPath,
				events: {
					change: this._onBindingChange.bind(this),
					dataRequested: function() {
						oDataModel.metadataLoaded().then(function() {
							// Busy indicator on view should only be set if metadata is loaded,
							// otherwise there may be two busy indications next to each other on the
							// screen. This happens because route matched handler already calls '_bindView'
							// while metadata is loaded.
							oViewModel.setProperty("/busy", true);
						});
					},
					dataReceived: function() {
						oViewModel.setProperty("/busy", false);
					}
				}
			});
		},

		_onBindingChange: function() {
			var oView = this.getView(),
				oViewModel = this.getModel("objectView"),
				oElementBinding = oView.getElementBinding();

			// No data for the binding
			if (!oElementBinding.getBoundContext()) {
				this.getRouter().getTargets().display("objectNotFound");
				return;
			}

			var oResourceBundle = this.getResourceBundle(),
				oObject = oView.getBindingContext().getObject(),
				sObjectId = oObject.ReportID,
				sObjectName = oObject.CompanyCode,
				status = oObject.BackOfficeStatus;
			oView.byId("idCb").setSelectedKey(status);
			oView.byId("txtComment").setText("");
			this.getView().byId("idpost").setValue("");

			// Everything went fine.
			oViewModel.setProperty("/busy", false);
			oViewModel.setProperty("/shareSendEmailSubject",
				oResourceBundle.getText("shareSendEmailObjectSubject", [sObjectId]));
			oViewModel.setProperty("/shareSendEmailMessage",
				oResourceBundle.getText("shareSendEmailObjectMessage", [sObjectName, sObjectId, location.href]));
		},
		onPost: function(oEvent) {
			var oView = this.getView();
			this.getView().byId("txtComment").setText("");
			var oFormat = DateFormat.getDateTimeInstance({
				pattern: "YYYY-MM-DDTHH:MM:SS"
			});
			var sDate = oFormat.format(new Date());
			var oObject = this.getView().getBindingContext().getObject();
			var sValue = oEvent.getParameter("value");
			var sStatus = oView.byId("idCb").getValue();
			var xUser = this.getModel("appView").getData().muid;
			var xUserName = this.getModel("appView").getData().name;
			var xComments = "User " + xUserName + " - ";
			var data = {
				"ReportID": oObject.ReportID,
				"UserID": xUser,
				"BackOfficeStatus": sStatus,
				"Comment": xComments + sValue,
				"Timestamp": new Date()
					/*	Xuser: oObject.UserID*/
			};

			/*		var statusUpdate = {
				"ReportID": oObject.ReportID,
				"BackOfficeStatus": sStatus,
				"ExclusionFlag": oObject.ExclusionFlag
			};
*/
			// Create comments service 
			this.getView().getModel().create("/ReconciliationReportComment", data, {
				success: function(oData, oResponse) {},
				error: function(oResponse) {}
			});
			// update status change service 
			/*		var service = "/ReconciliationReport(ReportID='" + oObject.ReportID + "')";
					this.getView().getModel().update(service, statusUpdate, {
						success: function(oData, oResponse) {},
						error: function(oResponse) {}
					});*/
			this.getView().getModel().refresh();
		},
		OnStatusChange: function() {

			var oView = this.getView();
			var oObject = oView.getBindingContext().getObject();
			var sBobStatus = oObject.BackOfficeStatus;
			var sStatus = oView.byId("idCb").getValue();
			if (sBobStatus === sStatus) {
				this.getView().byId("txtComment").setText("");
				this.getView().byId("idpost").setValue("");
			} else {
				this.getView().byId("txtComment").setText("  Please confirm Status changed to " + "'" + sStatus + "'");
				this.getView().byId("idpost").setValue("Status change -");
			}

		}

	});

});