define(["base/js/namespace"], function(Jupyter){
    var base_url = (Jupyter.notebook_list || Jupyter.notebook).base_url;
    var api_url = base_url + "conda/";
    var static_url = base_url + "nbextensions/nb_conda/";

    return {
        base_url: base_url,
        api_url: api_url,
        static_url: static_url
    };
});
