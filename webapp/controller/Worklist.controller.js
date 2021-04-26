sap.ui.define([
	"merck/controller/BaseController",
	"sap/ui/model/json/JSONModel",
	"merck/model/formatter",
	"sap/ui/model/Filter",
	"sap/ui/core/routing/History",
	'sap/m/MessageBox',
	'sap/ui/core/util/Export',
	'sap/ui/core/util/ExportTypeCSV',
	"sap/ui/model/FilterOperator"

], function(BaseController, JSONModel, formatter, Filter, History, MessageBox, Export, ExportTypeCSV, FilterOperator) {
	"use strict";

	return BaseController.extend("merck.controller.Worklist", {

		formatter: formatter,

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		/**
		 * Called when the worklist controller is instantiated.
		 * @public
		 */
		onInit: function() {
			var oViewModel,
				iOriginalBusyDelay,
				oTable = this.byId("table");

			// Put down worklist table's original value for busy indicator delay,
			// so it can be restored later on. Busy handling on the table is
			// taken care of by the table itself.
			iOriginalBusyDelay = oTable.getBusyIndicatorDelay();
			// keeps the search state
			this._aTableSearchState = [];

			// Model used to manipulate control states
			oViewModel = new JSONModel({
				worklistTableTitle: this.getResourceBundle().getText("worklistTableTitle"),
				shareOnJamTitle: this.getResourceBundle().getText("worklistTitle"),
				shareSendEmailSubject: this.getResourceBundle().getText("shareSendEmailWorklistSubject"),
				shareSendEmailMessage: this.getResourceBundle().getText("shareSendEmailWorklistMessage", [location.href]),
				tableNoDataText: this.getResourceBundle().getText("tableNoDataText"),
				tableBusyDelay: 0
			});
			this.setModel(oViewModel, "worklistView");

			// Make sure, busy indication is showing immediately so there is no
			// break after the busy indication for loading the view's meta data is
			// ended (see promise 'oWhenMetadataIsLoaded' in AppController)
			oTable.attachEventOnce("updateFinished", function() {
				// Restore original busy indicator delay for worklist's table
				oViewModel.setProperty("/tableBusyDelay", iOriginalBusyDelay);
			});
			/*	this.byId("inputErpErr").setFilterFunction(function(sTerm, oItem) {
					return oItem.getText().match(new RegExp(sTerm, "i"));
				});*/

			//  searchField  suggestion items Json Model 
			var oEprErrModel = new sap.ui.model.json.JSONModel();
			this.getView().setModel(oEprErrModel, "eprErrModel");
			var that = this;
			this.getOwnerComponent().getModel().metadataLoaded().then(function() {
				that.getOwnerComponent().getModel().read("/DistinctERPErrors", {
					async: true,
					success: function(data) {
						oEprErrModel.setData(data);
					},
					error: function() {

					}
				});

			});
			this.getRouter().getRoute("wlstatus").attachPatternMatched(this._onObjectMatchedStatus, this);
			this.getRouter().getRoute("wltable").attachPatternMatched(this._onObjectMatchedTable, this);

		},
		_onObjectMatchedStatus: function(oEvent) {
			var status = oEvent.getParameter("arguments").status;
			this.getView().byId("cbBoStatus").setSelectedKey(status);
			var aFilters = [];
			if (status !== "Total (without Exceptions)") {
				this.getView().byId("cbCountry").setSelectedKey("");
				this.getView().byId("cbErpSys").setSelectedKey("");
				this.getView().byId("cbCompanyCode").setSelectedKey("");
				this.getView().byId("cbSentForPayment").setSelectedKey("");
				this.getView().byId("cbBoStatus").setSelectedKey(status);
				aFilters.push(new Filter("BackOfficeStatus", sap.ui.model.FilterOperator.Contains, status));
			} else {
				this.getView().byId("cbCountry").setSelectedKey("");
				this.getView().byId("cbErpSys").setSelectedKey("");
				this.getView().byId("cbCompanyCode").setSelectedKey("");
				this.getView().byId("cbSentForPayment").setSelectedKey("");
				this.getView().byId("cbBoStatus").setSelectedKey("");
				aFilters.push(new Filter("BackOfficeStatus", sap.ui.model.FilterOperator.NE, "Exception"));
			}

			this.getView().byId("table").getBinding("items").filter(aFilters);

		},
		_onObjectMatchedTable: function(oEvent) {
			var colValue = oEvent.getParameter("arguments").colval;
			var odataParam = oEvent.getParameter("arguments").odataparam1;
			var col2Value = oEvent.getParameter("arguments").odataparam2;

			var aFilters = [];

			if (col2Value === "X") {
				this.getView().byId("cbCountry").setSelectedKey(colValue);
				this.getView().byId("cbErpSys").setSelectedKey("");
				this.getView().byId("cbCompanyCode").setSelectedKey("");
				this.getView().byId("cbSentForPayment").setSelectedKey("");
				this.getView().byId("cbBoStatus").setSelectedKey("");
				aFilters.push(new Filter(odataParam, sap.ui.model.FilterOperator.Contains, colValue));
			} else if (col2Value === "Y") {
				this.getView().byId("cbCompanyCode").setSelectedKey(colValue);
				this.getView().byId("cbCountry").setSelectedKey("");
				this.getView().byId("cbSentForPayment").setSelectedKey("");
				this.getView().byId("cbBoStatus").setSelectedKey("");
				aFilters.push(new Filter(odataParam, sap.ui.model.FilterOperator.Contains, colValue));
			} else {
				this.getView().byId("cbErpSys").setSelectedKey("");
				this.getView().byId("cbCountry").setSelectedKey("");
				this.getView().byId("cbSentForPayment").setSelectedKey("");
				this.getView().byId("cbCompanyCode").setSelectedKey(colValue);
				this.getView().byId("cbBoStatus").setSelectedKey(col2Value);
				aFilters.push(new Filter(odataParam, sap.ui.model.FilterOperator.Contains, colValue));
				aFilters.push(new Filter("BackOfficeStatus", sap.ui.model.FilterOperator.Contains, col2Value));
			}
			this.getView().byId("table").getBinding("items").filter(aFilters);

		},

		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */

		/**
		 * Triggered by the table's 'updateFinished' event: after new table
		 * data is available, this handler method updates the table counter.
		 * This should only happen if the update was successful, which is
		 * why this handler is attached to 'updateFinished' and not to the
		 * table's list binding's 'dataReceived' method.
		 * @param {sap.ui.base.Event} oEvent the update finished event
		 * @public
		 */
		onUpdateFinished: function(oEvent) {
			// update the worklist's object counter after the table update
			var sTitle,
				oTable = oEvent.getSource(),
				iTotalItems = oEvent.getParameter("total");
			// only update the counter if the length is final and
			// the table is not empty
			if (iTotalItems && oTable.getBinding("items").isLengthFinal()) {
				sTitle = this.getResourceBundle().getText("worklistTableTitleCount", [iTotalItems]);
			} else {
				sTitle = this.getResourceBundle().getText("worklistTableTitle");
			}
			this.getModel("worklistView").setProperty("/worklistTableTitle", sTitle);
		},

		/**
		 * Event handler when a table item gets pressed
		 * @param {sap.ui.base.Event} oEvent the table selectionChange event
		 * @public
		 */
		onPress: function(oEvent) {
			// The source is the list item that got pressed
			this._showObject(oEvent.getSource());
		},

		/**
		 * Event handler for navigating back.
		 * We navigate back in the browser historz
		 * @public
		 */
		onNavBack: function() {
			history.go(-1);
		},

		onSearch: function(oEvent) {
			if (oEvent.getParameters().refreshButtonPressed) {
				// Search field's 'refresh' button has been pressed.
				// This is visible if you select any master list item.
				// In this case no new search is triggered, we only
				// refresh the list binding.
				this.onRefresh();
			} else {
				var aTableSearchState = [];
				var cbErpSysFilter = this.getView().byId("cbErpSys").getSelectedKey();
				var cbCountryFilter = this.getView().byId("cbCountry").getSelectedKey();
				var cbCompanyCodeFilter = this.getView().byId("cbCompanyCode").getSelectedKey();
				var cbSentForPaymentFilter = this.getView().byId("cbSentForPayment").getSelectedKey();
				var cbBoStatusFilter = this.getView().byId("cbBoStatus").getSelectedKey();
				if (cbErpSysFilter) {
					aTableSearchState.push(new Filter("ERPSystem", FilterOperator.EQ, cbErpSysFilter));
				}
				if (cbCountryFilter) {
					aTableSearchState.push(new Filter("Country", FilterOperator.EQ, cbCountryFilter));
				}
				if (cbCompanyCodeFilter) {
					aTableSearchState.push(new Filter("CompanyCode", FilterOperator.EQ, cbCompanyCodeFilter));
				}
				if (cbSentForPaymentFilter) {
					aTableSearchState.push(new Filter("SentForPaymentDate", FilterOperator.EQ, cbSentForPaymentFilter));
				}
				if (cbBoStatusFilter) {
					aTableSearchState.push(new Filter("BackOfficeStatus", FilterOperator.EQ, cbBoStatusFilter));
				}
				/*	var sQuery = oEvent.getParameter("newValue");*/
				var sQuery = oEvent.getParameter("query");
				var aTokens = sQuery.split("*");
				var sQuery1 = "";
				for (var i = 0; i < aTokens.length; i++) {
					sQuery1 = sQuery1 + aTokens[i];
				}
				
				var orFilters = [];
				if (sQuery) {
					if (sQuery && sQuery.length > 0 && sQuery.charAt(0) === "*" && sQuery.slice(-1) !== "*") {
						/*aTableSearchState = [new Filter("ReportID", FilterOperator.EndsWith, sQuery1)];*/
						orFilters.push(new Filter("ReportID", FilterOperator.EndsWith, sQuery1));
					} else if (sQuery && sQuery.length > 0 && sQuery.slice(-1) === "*" && sQuery.charAt(0) !== "*") {
						orFilters.push(new Filter("ReportID", FilterOperator.StartsWith, sQuery1));
						/*aTableSearchState = [new Filter("ReportID", FilterOperator.StartsWith, sQuery1)];*/
					} else {
						orFilters.push(new Filter("ReportID", FilterOperator.Contains, sQuery1));
						/*aTableSearchState = [new Filter("ReportID", FilterOperator.Contains, sQuery1)];*/
					}
					if (sQuery1 !== "") {
						orFilters.push(new Filter("ERPError", FilterOperator.Contains, sQuery1));
					}
                    aTableSearchState.push(new Filter(orFilters,false));
				}
				if (aTableSearchState.length !== 0) {
					/*this.getView().byId("table").getBinding("items").filter(new sap.ui.model.Filter(aTableSearchState), false);*/
					this.getView().byId("table").getBinding("items").filter(aTableSearchState);
				} else {
					this.getView().byId("table").getBinding("items").filter([]);
				}

				/*this.getView().byId("table").getBinding("items").filter(aTableSearchState);*/

				//this._applySearch(aTableSearchState);

			}
		},

		/**
		 * Event handler for refresh event. Keeps filter, sort
		 * and group settings and refreshes the list binding.
		 * @public
		 */
		onRefresh: function() {
			var oTable = this.byId("table");
			oTable.getBinding("items").refresh();
		},

		/* =========================================================== */
		/* internal methods                                            */
		/* =========================================================== */

		/**
		 * Shows the selected item on the object page
		 * On phones a additional history entry is created
		 * @param {sap.m.ObjectListItem} oItem selected Item
		 * @private
		 */
		_showObject: function(oItem) {
			this.getRouter().navTo("object", {
				objectId: oItem.getBindingContext().getProperty("ReportID")
			});
		},

		/**
		 * Internal helper method to apply both filter and search state together on the list binding
		 * @param {sap.ui.model.Filter[]} aTableSearchState An array of filters for the search
		 * @private
		 */
		_applySearch: function(aTableSearchState) {
			var oTable = this.byId("table"),
				oViewModel = this.getModel("worklistView");
			oTable.getBinding("items").filter(aTableSearchState, "Application");
			// changes the noDataText of the list in case there are no filter results
			if (aTableSearchState.length !== 0) {
				oViewModel.setProperty("/tableNoDataText", this.getResourceBundle().getText("worklistNoDataWithSearchText"));
			}
		},
		onFilterSearch: function() {
			var cbErpSysFilter = this.getView().byId("cbErpSys").getSelectedKey();
			var cbCountryFilter = this.getView().byId("cbCountry").getSelectedKey();
			var cbCompanyCodeFilter = this.getView().byId("cbCompanyCode").getSelectedKey();
			var cbSentForPaymentFilter = this.getView().byId("cbSentForPayment").getSelectedKey();
			var cbBoStatusFilter = this.getView().byId("cbBoStatus").getSelectedKey();
			var aTableSearchState = [];
			if (cbErpSysFilter) {
				aTableSearchState.push(new Filter("ERPSystem", FilterOperator.EQ, cbErpSysFilter));
			}
			if (cbCountryFilter) {
				aTableSearchState.push(new Filter("Country", FilterOperator.EQ, cbCountryFilter));
			}
			if (cbCompanyCodeFilter) {
				aTableSearchState.push(new Filter("CompanyCode", FilterOperator.EQ, cbCompanyCodeFilter));
			}
			if (cbSentForPaymentFilter) {
				aTableSearchState.push(new Filter("SentForPaymentDate", FilterOperator.EQ, cbSentForPaymentFilter));
			}
			if (cbBoStatusFilter) {
				aTableSearchState.push(new Filter("BackOfficeStatus", FilterOperator.EQ, cbBoStatusFilter));
			}

			this.getView().byId("table").getBinding("items").filter(aTableSearchState);
		},
		getSelectedItemText: function(oSelect) {
			return oSelect.getSelectedItem() ? oSelect.getSelectedItem().getKey() : "";
		},
		getFilters: function(aCurrentFilterValues) {
			this.aFilters = [];
			this.aKeys = ["ERPSystem", "Country", "CompanyCode", "SentForPaymentDate", "BackOfficeStatus"];
			this.aFilters = this.aKeys.map(function(sCriteria, i) {
				return new sap.ui.model.Filter(sCriteria, sap.ui.model.FilterOperator.EQ, aCurrentFilterValues[i]);
			});

			return this.aFilters;
		},
		onClear: function(oEvent) {
			this.oFilterBar = null;
			var sViewId = this.getView().getId();
			this.oFilterBar = sap.ui.getCore().byId(sViewId + "--filterBar");
			var oItems = this.oFilterBar.getAllFilterItems(true);
			for (var i = 0; i < oItems.length; i++) {
				var oControl = this.oFilterBar.determineControlByFilterItem(oItems[i]);
				if (oControl) {
					oControl.setValue("");
					oControl.setSelectedKey("");
				}
			}
		},
		onSuggest: function(oEvent) {
			var sValue = oEvent.getParameter("suggestValue");
			var aFilters = [];
			if (sValue) {
				/*	aFilters = [
						new sap.ui.model.Filter([
							new sap.ui.model.Filter("ERPError", function(sText) {
								return (sText || "").toUpperCase().indexOf(sValue.toUpperCase()) > -1;
							})
						], false)
					];*/
				aFilters.push(new Filter("ERPError", sap.ui.model.FilterOperator.Contains, sValue));

			}
			/*	oEvent.getSource().getBinding("suggestionItems").filter(aFilters);*/
			this.getView().byId("searchField").getBinding("suggestionItems").filter(aFilters);
			this.getView().byId("searchField").suggest();

		},
		onSearch1: function(oEvent) {
			var item = oEvent.getParameter("suggestionItem");
			if (item) {
				sap.m.MessageToast.show("search for: " + item.getText());
			}
		},
		OnErrTxtSearch: function(oEvent) {
			var txtErr = oEvent.getParameter("selectedItem").getProperty("text");
			var aFilters = [];
			aFilters.push(new Filter("ERPError", sap.ui.model.FilterOperator.Contains, txtErr));
			this.getView().byId("table").getBinding("items").filter(aFilters);

		},
		OnErrTxtChange: function(oEvent) {
			var lenErrTxt = oEvent.getParameter("value");
			if (lenErrTxt.length == "0") {
				var aFilters = [];
				aFilters.push(new Filter("ERPError", sap.ui.model.FilterOperator.Contains, lenErrTxt));
				this.getView().byId("table").getBinding("items").filter(aFilters, "Application");
				this.onRefresh();
			}
		},
		OnChangeErpsys: function() {
			var aCurrentFilterValues = [];
			aCurrentFilterValues.push(this.getSelectedItemText(this.getView().byId("cbErpSys")));
			var aFilters = [];
			aFilters.push(new Filter("ERPSystem", sap.ui.model.FilterOperator.Contains, aCurrentFilterValues));
			this.getView().byId("cbCompanyCode").getBinding("items").filter(aFilters);

		},
		onExcel: sap.m.Table.prototype.exportData || function(oEvent) {

			this.getView().getModel().setSizeLimit(10000);
			var oExport = new Export({

				// Type that will be used to generate the content. Own ExportType's can be created to support other formats
				exportType: new ExportTypeCSV({
					separatorChar: ",",
					charset: "utf-8"
				}),

				// Pass in the model created above
				models: this.getView().getModel(),

				// binding information for the rows aggregation
				rows: {
					path: "/ReconciliationReport"

				},

				// column definitions with column name and binding info for the content

				columns: [{
						name: "Report ID",
						template: {
							content: "{ReportID}"
						}
					}, {
						name: "Company Code",
						template: {
							content: "{CompanyCode}"
						}
					}, {
						name: "ERP System",
						template: {
							content: "{ERPSystem}"
						}
					}, {
						name: "SentForPaymentDate",
						template: {
							content: "{SentForPaymentDate}"
						}
					}, {
						name: "ERP-error text",
						template: {
							content: "{ERPError}"
						}
					}, {
						name: "Remediation State",
						template: {
							content: "{BackOfficeStatus}"
						}
					}, {
						name: "Report Date",
						template: {
							content: "{ReportDate}"
						}
					}, {
						name: "Release Date",
						template: {
							content: "{ReleaseDate}"
						}
					}, {
						name: "Vendor ID",
						template: {
							content: "{VendorID}"
						}
					}, {
						name: "VendorID Alternative",
						template: {
							content: "{VendorIDAlternative}"
						}
					}, {
						name: "Bank VendorID",
						template: {
							content: "{BankVendorID}"
						}
					}, {
						name: "Company CodeEmployee",
						template: {
							content: "{CompanyCodeEmployee}"
						}
					}, {
						name: "ValidationConcur ERP",
						template: {
							content: "{ValidationConcurERP}"
						}
					}, {
						name: "Validation Vendor",
						template: {
							content: "{ValidationVendor}"
						}
					}, {
						name: "Concur PaymentStatus",
						template: {
							content: "{ConcurPaymentStatus}"
						}
					}, {
						name: "ERP PaymentStatus",
						template: {
							content: "{ERPPaymentStatus}"
						}
					}, {
						name: "Days Outstanding",
						template: {
							content: "{DaysOutstanding}"
						}
					}, {
						name: "PaymentType",
						template: {
							content: "{PaymentType}"
						}
					}, {
						name: "SAP_BKPF_BUKRS",
						template: {
							content: "{SAP_BKPF_BUKRS}"
						}
					}, {
						name: "SAP_BKPF_BELNR",
						template: {
							content: "{SAP_BKPF_BELNR}"
						}
					}, {
						name: "SAP_BKPF_GJAHR",
						template: {
							content: "{SAP_BKPF_GJAHR}"
						}
					}, {
						name: "SAP_BKPF_BLART",
						template: {
							content: "{SAP_BKPF_BLART}"
						}
					}, {
						name: "SAP_BKPF_XBLNR",
						template: {
							content: "{SAP_BKPF_XBLNR}"
						}
					}, {
						name: "SAP_BKPF_BKTXT",
						template: {
							content: "{SAP_BKPF_BKTXT}"
						}
					}, {
						name: "SAP_BKPF_GRPID",
						template: {
							content: "{SAP_BKPF_GRPID}"
						}
					}, {
						name: "SAP_BSEG_AUGDT",
						template: {
							content: "{SAP_BSEG_AUGDT}"
						}
					}, {
						name: "SAP_BSEG_AUGCP",
						template: {
							content: "{SAP_BSEG_AUGCP}"
						}
					}, {
						name: "SAP_BSEG_AUGBL",
						template: {
							content: "{SAP_BSEG_AUGBL}"
						}
					}, {
						name: "SAP_BSEG_BSCHL",
						template: {
							content: "{SAP_BSEG_BSCHL}"
						}
					}, {
						name: "SAP_BSEG_KOART",
						template: {
							content: "{SAP_BSEG_KOART}"
						}
					}, {
						name: "SAP_BSEG_SAKNR",
						template: {
							content: "{SAP_BSEG_SAKNR}"
						}
					}, {
						name: "SAP_BSEG_HKONT",
						template: {
							content: "{SAP_BSEG_HKONT}"
						}
					}, {
						name: "SAP_BSEG_LIFNR",
						template: {
							content: "{SAP_BSEG_LIFNR}"
						}
					}, {
						name: "SAP_REGUH_LAUFD",
						template: {
							content: "{SAP_REGUH_LAUFD}"
						}
					}, {
						name: "SAP_REGUH_LAUFI",
						template: {
							content: "{SAP_REGUH_LAUFI}"
						}
					}, {
						name: "ERPErrorSAP",
						template: {
							content: "{ERPErrorSAP}"
						}
					}, {
						name: "SAP_LOG_ERR_HANDLING",
						template: {
							content: "{SAP_LOG_ERR_HANDLING}"
						}
					}, {
						name: "SAP_LOG_LARGE",
						template: {
							content: "{SAP_LOG_LARGE}"
						}
					}, {
						name: "SAP_LOG_STATUS_DOC",
						template: {
							content: "{SAP_LOG_STATUS_DOC}"
						}
					}, {
						name: "SAP_LOG_STATUS_FILE",
						template: {
							content: "{SAP_LOG_STATUS_FILE}"
						}
					}, {
						name: "SAP_LOG_STATUS_ARCH",
						template: {
							content: "{SAP_LOG_STATUS_ARCH}"
						}
					}, {
						name: "OracleCompanyCode",
						template: {
							content: "{OracleCompanyCode}"
						}
					}, {
						name: "OracleVendorID",
						template: {
							content: "{OracleVendorID}"
						}
					}, {
						name: "OraclePaymentMethod",
						template: {
							content: "{OraclePaymentMethod}"
						}
					}, {
						name: "OracleInvoiceDate",
						template: {
							content: "{OracleInvoiceDate}"
						}
					}, {
						name: "OracleInvoiceStatus",
						template: {
							content: "{OracleInvoiceStatus}"
						}
					}, {
						name: "ERPErrorOracle",
						template: {
							content: "{ERPErrorOracle}"
						}
					}

				]
			});

			// download exported file
			oExport.saveFile().catch(function(oError) {
				MessageBox.error("Error when downloading data. Browser might not be supported!\n\n" + oError);
			}).then(function() {
				oExport.destroy();
			});

		},
		onBackHome: function() {
			var sPreviousHash = History.getInstance().getPreviousHash();
			if (sPreviousHash !== undefined) {
				history.go(-1);
			} else {
				this.getRouter().navTo("home");
			}
			this.getView().getModel().refresh();

		}
	});
});