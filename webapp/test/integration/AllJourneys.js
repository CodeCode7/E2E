jQuery.sap.require("sap.ui.qunit.qunit-css");
jQuery.sap.require("sap.ui.thirdparty.qunit");
jQuery.sap.require("sap.ui.qunit.qunit-junit");
QUnit.config.autostart = false;

sap.ui.require([
		"sap/ui/test/Opa5",
		"merck/test/integration/pages/Common",
		"sap/ui/test/opaQunit",
		"merck/test/integration/pages/Worklist",
		"merck/test/integration/pages/Object",
		"merck/test/integration/pages/NotFound",
		"merck/test/integration/pages/Browser",
		"merck/test/integration/pages/App"
	], function (Opa5, Common) {
	"use strict";
	Opa5.extendConfig({
		arrangements: new Common(),
		viewNamespace: "merck.view."
	});

	sap.ui.require([
		"merck/test/integration/WorklistJourney",
		"merck/test/integration/ObjectJourney",
		"merck/test/integration/NavigationJourney",
		"merck/test/integration/NotFoundJourney"
	], function () {
		QUnit.start();
	});
});