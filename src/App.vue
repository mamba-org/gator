<template>
  <v-app>

    <v-content>
    <v-row>
    <v-col
      cols="12"
      sm="4"
    >
    <v-card>
       <v-list>
         <v-subheader>SELECT ENVIRONMENT</v-subheader>
         <v-list-item-group
           v-model="selectedEnvIndex"
           color="primary">
           <v-list-item
             v-for="env in envs"
             :key="env"
           >
             {{ env }}
           </v-list-item>
         </v-list-item-group>
       </v-list>
    </v-card>
    </v-col>

    <v-col
      cols="12"
      sm="4"
    >
    <v-card>
      <p>Selected environment (name): {{ selectedEnvName }}</p>
    </v-card>
    <v-card>
      <v-subheader>SELECT PACKAGE</v-subheader>
      <v-data-table
        v-model="selectedPkg"
        :headers="columns"
        :items="items"
        :single-select=false
        item-key="name"
        show-select
        class="elevation-1"
      >
        <template v-slot:top>
        </template>
      </v-data-table>
    </v-card>
    <v-card>
      <Network :data-promise="depData" :key="componentKey"></Network>
    </v-card>
    </v-col>

    <v-col
      cols="12"
      sm="4"
    >
    <v-card>
      <v-subheader>SEARCH FOR PACKAGE</v-subheader>
      <cv-search
        v-model="searchPkg">
      </cv-search>
      <cv-data-table
        :columns="searchColumns"
        :data="searchItems"
        item-key="build"
      >
      </cv-data-table>
    </v-card>
    </v-col>
    </v-row>
    </v-content>
  </v-app>
</template>

<script>
import axios from 'axios';
import { CvDataTable, CvSearch } from '@carbon/vue';
import Network from './components/Network';

export default {
  name: 'App',

  components: {
    CvDataTable,
    CvSearch,
    Network
  },

  data: () => ({
    envs: [],
    items: [],
    selectedEnvIndex: [],
    selectedEnvName: '',
    selectedPkg: [],
    selectedPkgName: [],
    searchPkg: '',
    searchItems: [],
    baseUrl: 'http://0.0.0.0:5000',
    depUrl: [],
    depData: [],
    componentKey: 0,
    columns: [{text: "Package", value: "name"},
              {text: "Version", value: "version", sortable: false}],
    searchColumns: [{text: "Channel", value: "channel"},
              {text: "Build", value: "build"}]
  }),
  watch: {
    // whenever selectedEnvIndex changes, this function will run
    selectedEnvIndex: function () {
      this.getEnvName()
    },
    // whenever selectedPkg changes, this function will run
    selectedPkg: function () {
      this.getPkgName()
    },
    // whenever selectedEnvName changes, this function will run
    selectedEnvName: function () {
      this.getPkgs()
    },
    // whenever searchPkg changes, this function will run
    searchPkg: function () {
      this.getChannels()
    },
  },

  mounted: function() {
    this.getEnvs();
  },
  methods: {
    getEnvs() {
      let url = this.baseUrl + '/' + 'envs';
      axios.get(url).then((response) => {
        this.envs = response.data.envs;
      }).catch(error => { console.log(error); });
    },
    getEnvName() {
      let name = this.envs[this.selectedEnvIndex].split('/').pop();
      if (name.includes('miniconda') || name.includes('anaconda')) {
        this.selectedEnvName = 'base';
      } else {
        this.selectedEnvName = name;
      }
    },
    getPkgs() {
      let reqUrl = this.baseUrl + '/envs/' + this.selectedEnvName;
      axios.get(reqUrl).then((response) => {
        this.items = response.data;
      }).catch(error => { console.log(error); });
    },
    getPkgName() {
      this.componentKey += 1;
      let pkg = this.selectedPkg[0];
      if (pkg && pkg.name) {
        let pkgNames = this.selectedPkg.map(function (i) { return i.name; });
        this.selectedPkgName = pkgNames;
      } else {
        this.selectedPkgName = ['python'];
      }
      let url = this.baseUrl + '/pkgs';
      this.depUrl = this.selectedPkgName.map(function (i) { return url + '/' + i });
      this.depData = this.depUrl.map(u => fetch(u).then(resp => resp.json()));
    },
    getChannels() {
      let reqUrl = this.baseUrl + '/search/' + this.searchPkg;
      axios.get(reqUrl).then((response) => {
        this.searchItems = response.data.result.pkgs;
      }).catch(error => { console.log(error); });
    },
  },
};
</script>
