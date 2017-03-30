define(function(require) {
    "use strict";
    var $ = require('jquery');
    var Jupyter = require('base/js/namespace');
    var models = require('./models');
    var views = require('./views');
    var urls = require('./urls');
    var dialog = require('base/js/dialog');
    var utils = require('base/js/utils');
    var $view = $('#conda');

    jQuery.fn.center = function () {
        this.css("position","absolute");
        this.css("top", Math.max(0, (($(window).height() - $(this).outerHeight()) / 2) +
                                                    $(window).scrollTop()) + "px");
        this.css("left", Math.max(0, (($(window).width() - $(this).outerWidth()) / 2) +
                                                    $(window).scrollLeft()) + "px");
        return this;
    }

    function show_conda_view($view) {
        var d = dialog.modal({
            title: 'Conda Packages',
            body: $view,
            open: function() {
                $('#searchbox').focus();
            },
            keyboard_manager: Jupyter.notebook.keyboard_manager
        });
        d.on('hide.bs.modal', function() {
            // detach the conda view so it isn't destroyed with the dialog box
            $view.detach();
        });
        d.find('.modal-dialog').css({width: "80vw"});
    }

    function load_conda_view() {
        if($view.length === 0) {
            // Not loaded yet
            utils.ajax(urls.static_url + 'tab.html', {
                dataType: 'html',
                success: function(tab_html, status, xhr) {
                    // Load the 'conda tab', hide the Environments portion
                    $view = $(tab_html);
                    $view.find('#conda').removeClass('tab-pane').hide();
                    $view.find('#environments').hide();
                    $('body').append($view);

                    views.AvailView.init();
                    views.InstalledView.init();

                    models.available.view = views.AvailView;
                    models.installed.view = views.InstalledView;

                    // Load the list of available packages.
                    // This is slow, so do it only the first time this is shown.
                    models.available.load();

                    // Also load environment list. Only need to do this once,
                    // then we'll know the current environment and it will
                    // also trigger a load of the installed packages.

                    models.environments.load().then(select_notebook_kernel_env);
                    show_conda_view($view);
                }
            });
        }
        else {
            // Refresh list of installed packages.
            // This is fast, and more likely to change,
            // so do it every time the menu is shown.
            select_notebook_kernel_env().then(models.installed.load)
            show_conda_view($view);
        }
    }

    function select_notebook_kernel_env() {
        /*
        Select the current environment for the running kernel.
        This is dependent on behavior of 'nb_conda_kernels' 2.0.0:
        - <normal name, like ir, python3, etc>  # server env
        - conda-env-<env name>-<lang key, py or ir>
        - conda-root-<lang key>
        */
        var kernel_name = Jupyter.notebook.kernel.name,
            kernel_env_re = /^conda-(env-)?(.+?)(-[^\-]*)?$/,
            m = kernel_env_re.exec(kernel_name);

        if(m) {
            return models.environments.select({ name: m[2] });
        }
        else {
            return models.environments.select({ is_default: true });
        }
    }

    function create_placeholder() {
        var $placeholder = $('<div/>').attr('id', 'conda_view').hide();
        $('body').append($placeholder);
    }

    function load() {
        if (!Jupyter.notebook) return;
        $('head').append(
            $('<link>')
            .attr('rel', 'stylesheet')
            .attr('type', 'text/css')
            .attr('href', urls.static_url + 'conda.css')
        );

        utils.ajax(urls.static_url + 'menu.html', {
            dataType: 'html',
            success: function(menu_html, status, xhr) {
                // Configure Conda items in Kernel menu
                $("#kernel_menu").append($(menu_html));
                $('#conda_menu_item').click(load_conda_view);
            }
        });
    }
    return {
        load_ipython_extension: load
    };
});
