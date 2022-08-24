module.exports = (config = {}) => {

  const express = require('express');
  var router = express.Router();

  if (!config.table_data_path) return router;

  const fs = require('node:fs');
  // const { JSONPath } = require('jsonpath-plus');

  // store the table's data in memory as a cache
  // keep track of changes to the table
  // write the cache to file every second, but only if there have been changes

  // load the file
  var table_data = [];

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

  // R - READ (table)
  router.get('/', function (req, res, next) {
    // tha page requested a fresh copy of the table
    // return a copy from the cache
    res.json(table_data);
  });

  // U - UPDATE (cell)
  router.patch('/', function (req, res, next) {
    // the page requested an atomic change to the table
    // req.body.id=...
    // req.body.field=...
    // req.body.value=...

    // pass the change to JSONPath on the cached table object to make the change
    // let result = { jsonpath: `$[?(@.id==${req.body.id})].${req.body.field}`, value: req.body.value, found: false, success: false };
    // JSONPath({
    //   path: result.jsonpath, json: table_data, callback: (value, type, payload) => {
    //     // console.log(value, type, payload);
    //     result.found = true;
    //     if (type === 'value') {
    //       payload.parent[payload.parentProperty] = req.body.value;
    //       result.success = true;
    //       // record the change requests
    //       recent_changes.push(result);
    //     }
    //   }
    // });

    try {
      let result = { ...req.body, found: false, success: false };
      let found_row = table_data.find((row) => row.id === req.body.id);
      if (found_row) {
        result.found = true;
        found_row[req.body.field] = req.body.value;
        result.success = true;
      }
      console.log(result);
      res.json(result);
    } catch (error) {
      res.json({ ...result, error });
    }
  });

  // C - CREATE (row)
  router.post('/', function (req, res, next) {
    // the page requested to add a row to the table
    // the object in req.body is the definition of the new row
    // if the body is falsy (including undefined) then make a fresh unpopulated row
    if (!req.body) req.body = {};
    let new_row = req.body;
    try {
      // assign the next sequential id to the row
      // find the greatest id and add 1
      new_row.id = table_data.reduce((id, row) => (row.id > id) ? row.id : id, -1) + 1;
      console.log('new_row.id:', new_row.id);
      // insert the row into the cache
      table_data.push(new_row);
      console.log(table_data);
      // respond with success and the new_id field
      res.json({ success: true, id: new_row.id });
    } catch (error) {
      res.json({ success: false, error });
    }
  });

  // D - DELETE
  router.delete('/', function (req, res, next) {
    // the page requested to delete a row from the table
    // the id of the row is in req.body.id
    try {
      let row_index = table_data.findIndex((row) => row.id === req.body.id);
      if (row_index > -1)
        table_data.splice(row_index, 1);
      // respond with success even i f the row wasn't found
      res.json({ success: true });
    } catch (error) {
      // respond with failure and the error
      res.json({ success: false, error });
    }
  });
  return router;
}
