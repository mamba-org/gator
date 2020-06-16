<script>
import vis from 'vis';

export default {
  name: 'non-vue-network',
  render (h) {
    return h('div', {
      attrs: {
        class: 'container'
      }
    })
  },
  props: ['dataPromise'],
  mounted() {
    Promise.all(this.dataPromise).then(data => {
      let graph_roots = data.map(function (i) {
        return i.result.graph_roots;
      });
      // Flatten array (made like list comprehension)
      graph_roots = graph_roots.flat();
      let pkgs = data.map(function (i) {
        return i.result.pkgs;
      });
      // Idem
      pkgs = pkgs.flat();
      // Filter out duplicate dependencies (by name)
      let uniqDeps = pkgs.filter((v, i, a) =>
        a.findIndex(t => (t.name === v.name)) === i);
      return {'graph_roots': graph_roots, 'pkgs': uniqDeps};
    })
    .then(data => {
      let nodes = [];
      let edges = [];
      let pkgGroup = [];
      for (let pkg of data.pkgs)
      {
        if (data.graph_roots.includes(pkg.name)) {
          pkgGroup = 'roots';
        } else {
          pkgGroup = 'higher-order';
        }
        nodes.push({id: pkg.name, label: pkg.name, group: pkgGroup});
        if (pkg.depends)
        {
          for (let dep of pkg.depends)
          {
            edges.push({from: pkg.name, to: dep.split(" ")[0]})
          }
        }
      }

      var container = this.$el;

      var graphData = {
        nodes: nodes,
        edges: edges
      };
      var options = {
        autoResize: true,
        edges: {
          arrows: 'to'
        },
        groups: {
          roots: {color: 'pink'}
        },
        layout: {
          randomSeed: 123
        }
      };
      new vis.Network(container, graphData, options);
    });
  },
};
</script>

<style>
.container {
  height: 70vh;
  width: 100%;
}
</style>
