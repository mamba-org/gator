import os
import json
import subprocess
from flask import Flask, Response
from flask_cors import CORS

def json_response(j):
    return Response(json.dumps(j),  mimetype='application/json')

def get_mamba_json(args):
    result = subprocess.run(["mamba"] + args + ["--json"],
                            stdout=subprocess.PIPE)
    res = result.stdout.decode('utf-8')
    return json.loads(res)

def get_mamba_repoquery(args):
    result = subprocess.run(["mamba"] + ["repoquery"] + args,
                            stdout=subprocess.PIPE)
    res = result.stdout.decode('utf-8')
    return json.loads(res)

def create_app(test_config=None):
    # create and configure the app
    app = Flask(__name__, instance_relative_config=True)
    CORS(app)

    # a simple page that says hello

    @app.route('/hello')
    def hello():
        return 'Hello, World!'

    @app.route('/envs/<name>')
    def list_envs(name=None):
        exphist_json = get_mamba_json(["env", "export",
            "--from-history", "-n", name])
        deps = exphist_json["dependencies"]
        pkg_list = [{"name": k.split("=")[0].split("[")[0],
                     "version": "".join(k.split("=")[1:]).split("]")[0].replace("'", "")}
                     for k in deps]
        return json_response(pkg_list)

    @app.route('/envs')
    def all_envs():
        return get_mamba_json(["env", "list"])

    @app.route('/pkgs/<name>')
    def get_deps(name=None):
        query_json = get_mamba_repoquery(["--json", "depends", name,
            # TODO handle `name + "=" + version`
            "--installed"])  # TODO drop this
        return json_response(query_json)

    @app.route('/search/<name>')
    def search_pkg(name=None):
        query_json = get_mamba_repoquery(["--json", "search", name])
        return json_response(query_json)

    return app

app = create_app()

if __name__ == "__main__":
    app.debug = True
    app.run(host='0.0.0.0', port=5000)
