<template>
  <v-app>

    <v-content>
    <v-row>
    <v-col
      cols="12"
      sm="4"
    >
    <v-card>
      <v-subheader>SELECT ENVIRONMENT</v-subheader>
      <cv-multi-select
        :label="envSelectLabel"
        :options="envs"
        v-model="selectedEnv"
      >
      </cv-multi-select>
    </v-card>
    </v-col>

    <v-col
      cols="12"
      sm="4"
    >
    <v-card>
      <p>Selected environment (name): {{ selectedEnv }}</p>
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
        @sort="onSort"
      >
        <template slot="headings">
          <cv-data-table-heading heading="Channel" sortable />
          <cv-data-table-heading heading="Build" sortable />
        </template>
      </cv-data-table>
    </v-card>
    </v-col>
    </v-row>
    </v-content>
  </v-app>
</template>

<script>
import axios from 'axios';
import {
  CvDataTable,
  CvDataTableHeading,
  CvMultiSelect,
  CvSearch
} from '@carbon/vue';
import Network from './components/Network';

export default {
  name: 'App',

  components: {
    CvDataTable,
    CvDataTableHeading,
    CvMultiSelect,
    CvSearch,
    Network
  },

  data: () => ({
    envs: [],
    envSelectLabel: 'Click one environment prefix',
    items: [],
    selectedEnv: [],
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
    searchColumns: ["Channel", "Build"]
  }),
  watch: {
    // whenever selectedEnv changes, this function will run
    selectedEnv: function () {
      this.getEnvName(),
      this.getPkgs()
    },
    // whenever selectedPkg changes, this function will run
    selectedPkg: function () {
      this.getPkgName()
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
    onSort(sortBy) {
      if (sortBy) {
        this.searchItems.sort((a, b) => {
          const itemA = a[sortBy.index];
          const itemB = b[sortBy.index];
          if (sortBy.order === 'descending') {
            if (sortBy.index === 2) {
              // sort as number
              return parseFloat(itemA) - parseFloat(itemB);
            } else {
              return itemB.localeCompare(itemA);
            }
          }
          if (sortBy.order === 'ascending') {
            if (sortBy.index === 2) {
              // sort as number
              return parseFloat(itemB) - parseFloat(itemA);
            } else {
              return itemA.localeCompare(itemB);
            }
          }
          return 0;
        });
      }
    },
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
        let pk = response.data.result.pkgs;
        this.searchItems = pk.map(function(el) {
          return [el.channel, el.build];
        })
      }).catch(error => { console.log(error); });
    },
  },
};
</script>

<style lang="scss">
@import './styles/carbon';
</style>
