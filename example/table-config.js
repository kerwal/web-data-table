// exports the config for a Tabulator table; (new Tabulator('..', {this config}))
// this script is evaluated by the client's browser, so functions work in the
//      browser's context
// all options of the Tabulator table, including column config (a.k.a. table schema)
//      are defined here
// defined in the AMD modular format
define(function() {
    return {
        ajaxURL: "/table-data",
        height: "100%", // set height of table to enable virtual DOM
        layout: "fitColumns", //fit columns to width of table (optional)
        columns: [ //Define Table Columns
            { title: "Name", field: "name", sorter: "string", width: 150, editor: true },
            { title: "Age", field: "age", sorter: "number", hozAlign: "left", formatter: "progress", editor: true },
            { title: "Favourite Color", field: "col", sorter: "string", headerSort: false, editor: true },
            { title: "Date Of Birth", field: "dob", sorter: "date", hozAlign: "center", editor: true },
        ],
    };
});