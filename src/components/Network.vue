<script>
import * as d3 from 'd3';
import vis from 'vis';

export default {
  name: 'non-vue-network',
  render (h) {
    return h('div')
  },
  mounted() {
    fetch("http://0.0.0.0:8000/numpy_deps.json").then(async (response) => {
      console.log(response);
      let contents = await response.json();
      var nodes = [];
      var edges = [];
      for (let pkg of contents.result.pkgs)
      {
        console.log(pkg.name)
        nodes.push({id: pkg.name, label: pkg.name});
        if (pkg.depends)
        {
          console.log(pkg.depends)
          for (let dep of pkg.depends)
          {
            edges.push({from: pkg.name, to: dep.split(" ")[0]})
          }
        }
      }

      var dataset = new vis.DataSet(nodes);
      var container = this.$el;

      var data = {
        nodes: nodes,
        edges: edges
      };
      var options = {autoResize: true};
      var network = new vis.Network(container, data, options);
    });
  },
};
</script>
