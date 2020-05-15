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
    <p>Selected environment (prefix): {{ envs[selectedEnvIndex] }}</p>
    </v-card>
    <v-card>
    <p>Selected environment (name): {{ selectedEnvName }}</p>
    </v-card>
    <v-card>
      <v-data-table
        :headers="columns"
        :items="items"
      ></v-data-table>
    </v-card>
    </v-col>
    </v-row>
    </v-content>
  </v-app>
</template>

<script>
import axios from 'axios';
import HelloWorld from './components/HelloWorld';

export default {
  name: 'App',

  components: {
    HelloWorld,
  },

  data: () => ({
    envs: [],
    items: [],
    selectedEnvIndex: [],
    selectedEnvName: [],
    envUrl: 'http://0.0.0.0:5000/envs',
    columns: [{text: "Package", value: "name"},
              {text: "Version", value: "version", sortable: false},
              {text: "Platform", value: "platform"}]
  }),
  watch: {
    // whenever selectedEnvIndex changes, this function will run
    selectedEnvIndex: function () {
      this.getEnvName()
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
    getReqs() {
      let reqUrl = this.envUrl + '/' + this.selectedEnvName;
      axios.get(reqUrl).then((response) => {
        this.items = response.data;
      }).catch(error => { console.log(error); });
    },
  },
};
</script>
