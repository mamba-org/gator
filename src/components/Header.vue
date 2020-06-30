<template>

<div class="bx--grid">
  <div class="bx--row">
  <div class="bx--col">
  <h1>SELECT ENVIRONMENT</h1>
    <cv-multi-select
      :label="envSelectLabel"
      :options="envs"
      v-model="selectedEnv"
    >
    </cv-multi-select>
  </div>

  <div class="bx--col">
  <h3>Selected environment (name): {{ selectedEnv }}</h3>
  <h1>SELECT PACKAGE(S)</h1>
    <cv-multi-select
      :label="pkgSelectLabel"
      :options="items"
      v-model="selectedPkg"
    >
    </cv-multi-select>
    <Network :data-promise="depData" :key="componentKey"></Network>
  </div>

  <div class="bx--col">
    <Channels></Channels>
  </div>
  </div>

</div>

</template>

<script>
import axios from 'axios';
import {
  CvMultiSelect,
} from '@carbon/vue';
import Network from './Network';
import Channels from './Channels';

export default {
  name: 'Header',

  components: {
    CvMultiSelect,
    Network,
    Channels
  },

  data: () => ({
    envs: [],
    envSelectLabel: 'Click one environment prefix',
    selectedEnv: [],
    items: [],
    pkgSelectLabel: 'View dependency graph for...',
    selectedPkg: [],
    baseUrl: 'http://0.0.0.0:5000',
    depUrl: [],
    depData: [],
    componentKey: 0,
    columns: [{text: "Package", value: "name"},
              {text: "Version", value: "version", sortable: false}],
  }),
  watch: {
    // whenever selectedEnv changes, this function will run
    selectedEnv: function () {
      this.getEnvName(),
      this.getPkgs()
    },
    // whenever selectedPkg changes, this function will run
    selectedPkg: function () {
      this.getDepGraph()
    },
  },

  mounted: function() {
    this.getEnvs();
  },
  methods: {
    getEnvs() {
      let url = this.baseUrl + '/' + 'envs';
      axios.get(url).then((response) => {
        let li = response.data.envs;
        this.envs = li.map(el => {
          let envName = el.split('/').pop();
          if (envName.includes('miniconda') || envName.includes('anaconda')) {
            envName = 'base';
          }
          return {
            name: el,
            label: el,
            value: envName,
          };
        })
      }).catch(error => { console.log(error); });
    },
    getEnvName() {
      // forces single select
      this.selectedEnv = this.selectedEnv.pop();
    },
    getPkgs() {
      let reqUrl = this.baseUrl + '/envs/' + this.selectedEnv;
      axios.get(reqUrl).then((response) => {
        let pk = response.data;
        this.items = pk.map(el => {
          return {
            name: el.name,
            label: el.name + ' ' + el.version,
            value: el.name,
          };
        })
      }).catch(error => { console.log(error); });
    },
    getDepGraph() {
      this.componentKey += 1;
      let url = this.baseUrl + '/pkgs';
      this.depUrl = this.selectedPkg.map(function (i) { return url + '/' + i });
      this.depData = this.depUrl.map(u => fetch(u).then(resp => resp.json()));
    },
  },
};
</script>

<style>
  html {
     height: 100%;
  }
  body, #app {
     min-height: 100%;
  }
  .white-svg {
    fill: white;
  }
</style>
