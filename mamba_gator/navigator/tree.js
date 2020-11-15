define(function(require) {
  var $ = require("jquery");
  var Jupyter = require("base/js/namespace");

  function load() {
    if (!Jupyter.notebook_list) return;

    var base_url = (Jupyter.notebook_list || Jupyter.notebook).base_url;
    
    $("#tabs").append(
      $("<li>").append(
        $("<a>")
          .attr("id", "conda_tab")
          .attr("href", `${base_url}nbextensions/mamba_gator/index.html`)
          .attr("target", "_blank")
          .text("Conda")
      )
    );

    if (window.location.hash === "#conda") {
      $("#conda_tab").click();
    }
  }
  return {
    load_ipython_extension: load,
  };
});
