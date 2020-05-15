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
    <p>Selected environment: {{ envs[selectedEnvIndex] }}</p>
    </v-card>
    <v-card>
      <v-data-table
        :headers="columns"
        :items="items[envs[selectedEnvIndex]]"
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
import Req_1 from './json/req_1.json';
import Req_2 from './json/req_2.json';
import Req_3 from './json/req_3.json';

export default {
  name: 'App',

  components: {
    HelloWorld,
  },

  data: () => ({
    envs: [],
    selectedEnvIndex: [],
    items: {
       [Req_1.prefix]: Req_1.dependencies,
       [Req_2.prefix]: Req_2.dependencies,
       [Req_3.prefix]: Req_3.dependencies,
    },
    columns: [{text: "Package", value: "name"},
              {text: "Version", value: "version", sortable: false},
              {text: "Platform info", value: "platform"}]
  }),

  mounted: function() {
    this.getEnvs();
  },
  methods: {
    getEnvs() {
      let url = 'http://0.0.0.0:5000/envs';
      axios.get(url).then((response) => {
        this.envs = response.data.envs;
      }).catch(error => { console.log(error); });
    }
  },
};
</script>
