define(["jquery", "base/js/utils", "./common", "./urls"], function(
  $,
  utils,
  common,
  urls
) {
  "use strict";

  var NullView = {
    refresh: function() {}
  };

  var environments = {
    all: [],
    selected: null,
    view: NullView,
    _mapping: {
      python2: ["python=2", "ipykernel"],
      python3: ["python=3", "ipykernel"],
      r: ["r-base", "r-essentials"]
    },

    load: function() {
      // Load the list via ajax to the /environments endpoint
      var that = this;
      var error_callback = common.MakeErrorCallback(
        "Error",
        "An error occurred while listing Conda environments."
      );

      function handle_response(data, status, xhr) {
        var keep_selection = false;
        var default_env;
        var envs = data.environments || [];

        that.all = envs;

        // Select the default environment as current
        $.each(envs, function(index, env) {
          if (env.is_default) {
            default_env = env;
          }

          if (that.selected && that.selected.name == env.name) {
            // selected env still exists
            keep_selection = true;
          }
        });

        that.view.refresh(envs);

        if (!keep_selection) {
          // Lost selected env, pick a different one
          that.select(default_env);
        }
      }

      var settings = common.AjaxSettings({
        success: common.SuccessWrapper(handle_response, error_callback),
        error: error_callback
      });

      return utils.ajax(urls.api_url + "environments", settings);
    },

    select: function(env) {
      this.selected = _.findWhere(this.all, env);

      // refresh list of packages installed in the selected environment
      return installed.load();
    },

    create: function(name, type) {
      var error_callback = common.MakeErrorCallback(
        "Error Creating Environment",
        'An error occurred while creating "' + name + '"'
      );

      function create_success() {
        // Refresh list of environments since there is a new one
        environments.load();
      }

      var url = urls.api_url + utils.url_join_encode("environments");
      return requestServer(url, "POST", create_success, error_callback, {
        name: name,
        packages: this._mapping[type]
      });
    },

    clone: function(env, new_name) {
      var error_callback = common.MakeErrorCallback(
        "Error Cloning Environment",
        'An error occurred while cloning "' + env.name + '"'
      );

      function clone_success() {
        // Refresh list of environments since there is a new one
        environments.load();
      }
      var url = urls.api_url + utils.url_join_encode("environments");

      return requestServer(url, "POST", clone_success, error_callback, {
        name: new_name,
        twin: env.name
      });
    },

    remove: function(env) {
      var error_callback = common.MakeErrorCallback(
        "Error Removing Environment",
        'An error occurred while removing "' + env.name + '"'
      );

      function remove_success() {
        // Refresh list of environments since there is a new one
        environments.load();
      }
      var url = urls.api_url + utils.url_join_encode("environments", env.name);
      return requestServer(url, "DELETE", remove_success, error_callback);
    },

    export: function(env) {
      return (
        urls.api_url +
        utils.url_join_encode("environments", env.name) +
        "?download=1"
      );
    }
  };

  function requestServer(url, method, on_success, on_error, data) {
    function handle_response(data, status, xhr) {
      if (xhr.status == 202) {
        // "Accepted" - try back later on this async request
        setTimeout(function() {
          requestServer(
            xhr.getResponseHeader("Location") || url,
            "GET",
            handle_response,
            on_error
          );
        }, 1000);
      } else {
        common.SuccessWrapper(on_success, on_error)(data, status, xhr);
      }
    }

    var settings = common.AjaxSettings({
      data: JSON.stringify(data),
      type: method,
      success: common.SuccessWrapper(handle_response, on_error),
      error: on_error
    });

    return utils.ajax(url, settings);
  }

  var available = {
    packages: [],
    view: NullView,

    load: function() {
      // Load the package list via ajax to the /packages endpoint
      var that = this;

      function handle_response(data, status, xhr) {
        var packages = data.packages;
        $.each(packages, function(index, pkg) {
          pkg.selected = false;
        });

        that.packages = packages;
        that.view.refresh(that.packages);
      }

      var error_callback = common.MakeErrorCallback(
        "Error",
        "An error occurred while retrieving package information."
      );

      var url = urls.api_url + utils.url_path_join("packages");
      return requestServer(
        url,
        "GET",
        common.SuccessWrapper(handle_response, error_callback),
        error_callback
      );
    },

    get_selection: function() {
      return this.packages.filter(function(pkg) {
        return pkg.selected;
      });
    },

    select_none: function() {
      $.each(this.packages, function(index, pkg) {
        pkg.selected = false;
      });
    },

    get_selected_names: function() {
      return this.get_selection().map(function(pkg) {
        return pkg.name;
      });
    },

    conda_install: function() {
      var that = this;
      var packages = this.get_selected_names();

      if (packages.length == 0) {
        return;
      }

      var error_callback = common.MakeErrorCallback(
        "Error Installing Packages",
        "An error occurred while installing packages."
      );

      function install_success() {
        // Refresh list of packages installed in the current environment
        installed.load();
        that.select_none();
        that.view.refresh(that.packages);
      }
      var url =
        urls.api_url +
        utils.url_join_encode(
          "environments",
          environments.selected.name,
          "packages"
        );
      return requestServer(url, "POST", install_success, error_callback, {
        packages: packages
      });
    }
  };

  var installed = {
    packages: [],
    by_name: {},
    view: NullView,

    load: function() {
      if (environments.selected !== null) {
        return this.conda_list(environments.selected.name);
      } else {
        // Need an environment in order to display installed packages.
        this.packages = [];
        this.by_name = {};
        this.view.refresh([]);
        return $.Deferred().resolve();
      }
    },

    get_selection: function() {
      return this.packages.filter(function(pkg) {
        return pkg.selected;
      });
    },

    get_selected_names: function() {
      return this.get_selection().map(function(pkg) {
        return pkg.name;
      });
    },

    conda_list: function(query) {
      // Load the package list via ajax to the /environments/<name> endpoint
      var that = this;

      function handle_response(data, status, xhr) {
        var packages = data.packages || [];
        var by_name = {};

        $.each(packages, function(index, pkg) {
          pkg.selected = false;
          pkg.available = "";
          by_name[pkg.name] = pkg;
        });

        that.packages = packages;
        that.by_name = by_name;
        that.view.refresh(that.packages);
      }

      var error_callback = common.MakeErrorCallback(
        "Error",
        "An error occurred while retrieving installed packages."
      );

      var settings = common.AjaxSettings({
        success: common.SuccessWrapper(handle_response, error_callback),
        error: error_callback
      });

      var url = urls.api_url + utils.url_join_encode("environments", query);
      return utils.ajax(url, settings);
    },

    _update: function(dry_run, handler) {
      // Load the package list via ajax to the /environments/ENV/check endpoint
      var that = this;

      var packages = this.get_selected_names();

      if (packages.length == 0) {
        // If no packages are selected, update all
        packages = [];
      }

      var action;
      var msg;

      if (dry_run) {
        msg = "An error occurred while checking for package updates.";
        var url =
          urls.api_url +
          utils.url_join_encode("environments", environments.selected.name) +
          "?status=has_update";
        return requestServer(
          url,
          "GET",
          handler,
          common.MakeErrorCallback("Error", msg),
          { packages: packages }
        );
      } else {
        msg = "An error occurred while updating packages.";
        var url =
          urls.api_url +
          utils.url_join_encode(
            "environments",
            environments.selected.name,
            "packages"
          );
        return requestServer(
          url,
          "PATCH",
          handler,
          common.MakeErrorCallback("Error", msg),
          { packages: packages }
        );
      }
    },

    conda_check_updates: function() {
      var that = this;

      function handle_response(response, status, xhr) {
        $.each(response.updates, function(index, pkg) {
          var existing = that.by_name[pkg.name];

          // See if there is an existing entry.
          // Usually there will be, but an update
          // might pull in a new package as a dependency.
          if (existing) {
            existing.available = pkg.version + "-" + pkg.build_number;
          }
        });

        that.view.refresh(that.packages);
      }

      return this._update(true, handle_response);
    },

    conda_update: function() {
      var that = this;

      function handle_response(packages, status, xhr) {
        // Refresh list of packages to reflect changes
        that.load();
      }

      return this._update(false, handle_response);
    },

    conda_remove: function() {
      var that = this;
      var packages = this.get_selected_names();

      if (packages.length == 0) {
        return;
      }

      var error_callback = common.MakeErrorCallback(
        "Error Removing Packages",
        "An error occurred while removing packages."
      );

      function remove_success() {
        // Refresh list of packages installed in the current environment
        installed.load();
      }
      var url =
        urls.api_url +
        utils.url_join_encode(
          "environments",
          environments.selected.name,
          "packages"
        );
      return requestServer(url, "DELETE", remove_success, error_callback, {
        packages: packages
      });
    }
  };

  return {
    environments: environments,
    available: available,
    installed: installed
  };
});
