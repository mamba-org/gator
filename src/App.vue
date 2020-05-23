<template>
  <v-app>

    <v-content>
      <HelloWorld/>

    <v-row>
    <v-col>
    <v-card>
       <v-list>
         <v-subheader>ENVIRONMENTS</v-subheader>
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

    <v-col>
    <v-card>
    <p>Selected environment (prefix): {{ envs[selectedEnvIndex] }}
      <br>Selected environment (name): {{ selectedEnvName }}</br></p>
    </v-card>
    <v-card>
    <p>Select a package to view its dependencies as a tree!
       <br>Selected package: {{ selectedPkgName }}</br></p>
    </v-card>
    <v-card>
      <v-data-table
        v-model="selectedPkg"
        :headers="columns"
        :items="items"
        :single-select=true
        item-key="name"
        show-select
        class="elevation-1"
      >
        <template v-slot:top>
        </template>
      </v-data-table>
    </v-card>
    <v-card>
      <Network :datapath="depUrl"></Network>
    </v-card>
    </v-col>
    </v-row>
    </v-content>
  </v-app>
</template>

<script>
import axios from 'axios';
import HelloWorld from './components/HelloWorld';
import Network from './components/Network';

export default {
  name: 'App',

  components: {
    HelloWorld,
    Network
  },

  data: () => ({
    envs: [],
    items: [],
    selectedEnvIndex: [],
    selectedEnvName: [],
    selectedPkg: [],
    selectedPkgName: [],
    envUrl: 'http://0.0.0.0:5000/envs',
    depUrl: 'http://0.0.0.0:5000/pkgs/python',
    columns: [{text: "Package", value: "name"},
              {text: "Version", value: "version", sortable: false},
              {text: "Platform", value: "platform"}]
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
      this.getReqs()
    }
  },

  mounted: function() {
    this.getEnvs();
  },
  methods: {
    getEnvs() {
      let url = this.envUrl;
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
    getPkgName() {
      let name = this.selectedPkg[0].name;
      this.selectedPkgName = name;
    },
    getReqs() {
      let reqUrl = this.envUrl + '/' + this.selectedEnvName;
      axios.get(reqUrl).then((response) => {
        this.items = response.data;
      }).catch(error => { console.log(error); });
    },
  },
};
</script>
