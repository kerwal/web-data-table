module.exports = (config = {}) => {

  const express = require('express');
  var router = express.Router();

  if(!config.table_data_path) return router;

  const fs = require('node:fs');
  const { JSONPath } = require('jsonpath-plus');

  // store the table's data in memory as a cache
  // keep track of changes to the table
  // write the cache to file every second, but only if there have been changes

  // load the file
  var table_data = {};

  try {
    table_data = JSON.parse(fs.readFileSync(config.table_data_path));
  } catch (error) {
    console.error(error);
  }

  var recent_changes = [];

  // setup a repeating schedule to save the cache to disk
  // every second if something has changed
  function save_cache() {
    if (recent_changes.length > 0) {
      console.log(`changes detected, saving to disk: ${config.table_data_path}`);
      recent_changes = [];
      fs.writeFile(config.table_data_path, JSON.stringify(table_data, null, 2), () => {
        setTimeout(() => {
          save_cache();
        }, 1000);
      });
    } else
      setTimeout(() => {
        save_cache();
      }, 1000);
  }

  // start the save schedule after one second
  setTimeout(save_cache, 1000);

  router.get('/', function (req, res, next) {
    // tha page requested a fresh copy of the table
    // return a copy of the cache
    res.json(table_data);
  });

  router.patch('/', function (req, res, next) {
    // the page requested a change to the table
    // req.body.jsonpath=...
    // req.body.value=...
    // pass the change to JSONPath on the cached table object to make the change
    let result = { jsonpath: req.body.jsonpath, value: req.body.value, found: false, success: false };
    JSONPath({
      path: req.body.jsonpath, json: table_data, callback: (value, type, payload) => {
        // console.log(value, type, payload);
        result.found = true;
        if (type === 'value') {
          payload.parent[payload.parentProperty] = req.body.value;
          result.success = true;
          // record the change requests
          recent_changes.push({ jsonpath: req.body.jsonpath, value: req.body.value });
        }
      }
    });
    console.log(result);
    // console.dir(table_data);
    res.json(result);
  });

  return router;
}
