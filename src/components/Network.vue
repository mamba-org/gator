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
  props: ['datapath'],
  mounted() {
    fetch(this.datapath).then(async (response) => {
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

<style>
.container {
  height: 700px;
  width: 900px
}
</style>
