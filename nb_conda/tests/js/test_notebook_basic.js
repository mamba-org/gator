/* global casper */
casper.dashboard_test(function(){
  casper.screenshot.init("basic");
  casper.viewport(1440, 900)
    .then(basic_test);
});

function basic_test(){
  return this.then(function(){
    this.canSeeAndClick("the body", "body");
  });
}
