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
    this.dataPromise.then(async (contents) => {
      let graph_roots = contents.result.graph_roots;
      console.log(graph_roots);
      var nodes = [];
      var edges = [];
      var pkgGroup = [];
      for (let pkg of contents.result.pkgs)
      {
        console.log(pkg.name)
        if (graph_roots.includes(pkg.name)) {
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

      var data = {
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
      new vis.Network(container, data, options);
    });
  },
};
</script>

<style>
.container {
  height: 100vh;
  width: 100%;
}
</style>
