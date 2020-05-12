<template>
  <v-app>

    <v-content>
      <HelloWorld/>

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

      <tree-table
        class="table"
        :columns="columns"
        :table-data="items" />
    </v-content>
  </v-app>
</template>

<script>
import HelloWorld from './components/HelloWorld';
import EnvList from './json/env_list.json';
import Req_1 from './json/req_1.json';
import TreeTable from 'vue-tree-table-component'

export default {
  name: 'App',

  components: {
    HelloWorld,
    TreeTable,
  },

  data: () => ({
    envs: EnvList.envs,
    items: [
        Req_1
    ],
    columns: [{label: "Package", id: "dependencies"},
              {label: "Version", id: "null"},
              {label: "Description", id: "null"}]
  }),
};
</script>
