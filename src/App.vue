<template>
  <v-app>

    <v-content>
      <HelloWorld/>

    <v-row>
    <v-col>
    <v-card>
       <v-list>
         <v-subheader>ENVIRONMENTS</v-subheader>
         <v-list-item-group v-model="item" color="primary">
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
    <v-card v-for="item in items" :key="item.prefix">
      <v-data-table v-if="item.prefix === '/home/marianne/miniconda3/envs/mamba-gui'"
        :headers="columns"
        :items="item.dependencies"
      ></v-data-table>
    </v-card>
    </v-col>
    </v-row>
    </v-content>
  </v-app>
</template>

<script>
import HelloWorld from './components/HelloWorld';
import EnvList from './json/env_list.json';
import Req_1 from './json/req_1.json';

export default {
  name: 'App',

  components: {
    HelloWorld,
  },

  data: () => ({
    envs: EnvList.envs,
    items: [
        Req_1
    ],
    columns: [{text: "Package", value: "dependencies"},
              {text: "Version", value: "null", sortable: false},
              {text: "Description", value: "null", sortable: false}]
  }),
};
</script>
