<template>
  <v-app>
  <v-treeview :items="items">
  </v-treeview>

    <v-content>
      <HelloWorld/>
    </v-content>
  </v-app>
</template>

<script>
import HelloWorld from './components/HelloWorld';
import Req_1 from './json/req_1.json';

export default {
  name: 'App',

  components: {
    HelloWorld,
  },

  data: () => ({
    items: [
        Req_1
    ]
  }),
};
</script>
