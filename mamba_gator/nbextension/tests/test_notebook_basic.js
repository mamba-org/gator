/* global casper */
casper.dashboard_test(function() {
  casper.screenshot.init("basic");
  casper.options.waitTimeout = 20000;
  casper.viewport(1440, 900).then(basic_test);
});

function basic_test() {
  return this.then(function() {
    this.canSeeAndClick("the body", "body")
      .canSeeAndClick("the conda tab", "#conda_tab")
      .canSeeAndClick("some env", "#env_list_body .list_item .col-xs-3 a")
      .canSeeAndClick(
        "some installed package",
        "#installed_packages .list_item input[type=checkbox]"
      );
    //  It takes too long to load the list of available packages
    // .canSeeAndClick(
    //   "some available package",
    //   "#available_packages .list_item input[type=checkbox]"
    // );
  });
}
