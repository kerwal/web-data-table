require.config({
    paths: {
        moment: 'http://momentjs.com/downloads/moment.min',
        tabulator: 'https://unpkg.com/tabulator-tables@5.2.3/dist/js/tabulator.min',
        bootstrap: 'https://cdn.jsdelivr.net/npm/bootstrap@5.2.0/dist/js/bootstrap.bundle.min',
    },
    onNodeCreated: function (node, config, module, path) {
        // Here's  alist of differet integrities for different scripts
        // Append to this list for all scripts that you want SRI for
        let sri = {
            "bootstrap": "sha384-A3rJD856KowSb7dwlZdYEkO39Gagi7vIsF0jrRAoQmDKKtQBHUuLZ9AsSv4jD4Xa",
        };

        if (sri[module]) {
            node.setAttribute('integrity', sri[module]);
            node.setAttribute('crossorigin', 'anonymous');
        }
    }
});

requirejs(['tabulator', 'utils', 'bootstrap', 'table-config'], function (Tabulator, utils, bootstrap, table_config) {
    var table, importTable, importFile, importModal, importButton;

    if (!table_config) table_config = {};
    // override ajaxURL
    table_config.ajaxURL = '/table-data';
    // override footerElement
    table_config.footerElement = '#data-table-footer';

    // append button column
    if (!table_config.columns || !Array.isArray(table_config.columns)) table_config.columns = [];
    table_config.columns.push({
        formatter: (cell, formatterParams, onRendered) => {
            return "<i class='bi-trash3-fill'></i>";
        }, width: 40, hozAlign: "center", cellClick: (e, cell) => {
            let id = cell.getData().id;
            fetch('/table-data', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
                .then((response) => response.json())
                .then((body) => {
                    if (body.success) {
                        cell.getRow().delete();
                    }
                });
        }
    });

    // add menu to first column
    table_config.columns[0].headerMenu = [
        {
            label: "Import",
            action: function (e, column) {
                // prompt the user with a sample of the table in a Modal
                //  and give the user options for how to import it
                // MAYBE offer ways to manipulate the table
                // activate file browser then load the intermediary table with 3 rows
                utils.openFilePicker('.csv,text/csv')
                    .then(file => {
                        importFile = file;
                        // import just 3 lines into the intermediary table for now
                        return utils.readFileMaxLines(file, 3)
                        .then(contents => importCsv(importTable, contents));
                    })
                    .then(() => {
                        // show the modal
                        bootstrap.Modal.getOrCreateInstance(importModal).show();
                    });
            }
        },
    ];

    table = new Tabulator("#data-table", table_config);
    table.on("cellEdited", function (cell) {
        // dont send requests for cells that didn't actually change
        let cellValue = cell.getValue();
        if (cellValue == cell.getOldValue()) return;
        // send PATCH request to update data
        // $[?(@.id==3)].name
        // let body = new URLSearchParams();
        // body.append('jsonpath', `$[?(@.id==${cell.getData().id})].${cell.getField()}`);
        // body.append('value', cellValue);
        // TODO check for errors?
        fetch('/table-data', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: cell.getData().id, field: cell.getField(), value: cellValue }) });
    });
    document.getElementById('add-row-btn').onclick = () => {
        fetch('/table-data', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
            .then((response) => response.json())
            .then((body) => {
                if (body.success && body.id !== undefined) {
                    table.addData({ id: body.id });
                }
            });
    }

    // setup importTable in the importModal
    // copy the columns basics from the main table
    let import_columns = table_config.columns.map((column) => ({ ...column, editable: false }));
    importTable = new Tabulator("#importTable", { columns: import_columns });

    // find the modal in the document
    importModal = document.getElementById('importModal');
    // rig the Modal
    importModal.addEventListener('hidden.bs.modal', event => {
        // the modal has been hidden, do cleanup
        // - clear the intermediary table
        importTable.clearData();
        // ...?
    });

    // find the import button in the document
    importButton = document.getElementById('importButton');
    // rig the Import button to accept the imported file then fully import the file
    importButton.addEventListener('click', function (event) {
        // TODO need a path on the server for bulk operations, like full-replace, many-update, many-replace, many-delete, many-append
        // the button was clicked so fully import the CSV into the table
        utils.readFileContents(file)
        .then(contents => importCsv(table, contents));
    });
});