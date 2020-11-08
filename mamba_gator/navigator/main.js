define(function(require) {
  "use strict";
  var $ = require("jquery");
  var Jupyter = require("base/js/namespace");

  function load() {
    if (!Jupyter.notebook) return;

    var base_url = (Jupyter.notebook_list || Jupyter.notebook).base_url;

    // Configure Conda items in Kernel menu
    var kernelMenu = $("#kernel_menu");
    kernelMenu.append($("<li>").attr("class", "divider"));
    kernelMenu.append(
      $("<li>")
        .attr("id", "conda_menu_item")
        .append(
          $("<a>")
            .attr("id", "conda_tab")
            .attr("href", `${base_url}nbextensions/mamba_gator/index.html`)
            .attr("target", "_blank")
            .text("Conda Packages")
        )
    );
  }
  return {
    load_ipython_extension: load,
  };
});
