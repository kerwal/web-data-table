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

requirejs(['tabulator', 'bootstrap', 'table-config'], function (Tabulator, bootstrap, table_config) {
    if (!table_config) table_config = {};
    // override ajaxURL
    table_config.ajaxURL = '/table-data';
    // override paste action to prompt for action from user,
    //  but only when clipboardPasteAction === 'prompt'

    // TODO not working, fix it!
    if (table_config.clipboardPasteAction === 'prompt') {
        table_config.clipboardPasteAction = function (rowData) {
            // TODO prompt the user to choose which action to perform with the paste
            //      - insert (addData), update (updateorAddData), or replace (setData)
            var _table = this.table;

            const modal = bootstrap.Modal.getOrCreateInstance('#pasteActionModal');

            document.getElementById('pasteActionAcceptButton').onclick = (event) => {
                // find the checked option
                const radioButtons = document.querySelectorAll('input[name="pasteAction"]');
                let selectedPasteAction = "none";
                for (const radioButton of radioButtons) {
                    if (radioButton.checked) {
                        selectedPasteAction = radioButton.value;
                        break;
                    }
                }
                switch (selectedPasteAction) {
                    case "append":
                        _table.addData(rowData);
                        break;
                    case "update":
                        _table.updateData(rowData);
                        break;
                    case "replace":
                        _table.setData(rowData);
                        break;
                }
                modal.hide();
            };
            // TODO subscribe to the hidden event or rig the Paste button in the Modal
            //      to complete the paste action
            modal.show();
        }
    }
    var table = new Tabulator("#data-table", table_config);
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
});