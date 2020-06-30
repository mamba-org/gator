<template>
  <div>
      <h1>SEARCH FOR PACKAGE</h1>
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
  </div>
</template>

<script>
import axios from 'axios';
  import {
    CvDataTable,
    CvDataTableHeading,
    CvSearch
  } from '@carbon/vue';

export default {
  components: {
    CvDataTable,
    CvDataTableHeading,
    CvSearch,
  },

  data: () => ({
    searchPkg: '',
    searchItems: [],
    baseUrl: 'http://0.0.0.0:5000',
    searchColumns: ["Channel", "Build"]
  }),

  watch: {
    // whenever searchPkg changes, this function will run
    searchPkg: function () {
      this.getChannels()
    },
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
