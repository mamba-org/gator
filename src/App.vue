<template>
  <v-app>

    <v-content>
      <HelloWorld/>
      <v-treeview
        :items="items"
        selectable
        caption-field="dependencies"
      ></v-treeview>
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
