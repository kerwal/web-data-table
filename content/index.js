require.config({
    paths: {
        moment: 'http://momentjs.com/downloads/moment.min',
        tabulator: 'https://unpkg.com/tabulator-tables@5.2.3/dist/js/tabulator.min',
    }
});

requirejs(['tabulator', 'moment', 'table-config'], function (Tabulator, moment, table_config) {
    var table = new Tabulator("#data-table", table_config);
    table.on("cellEdited", function (cell) {
        // dont send requests for cells that didn't actually change
        let cellValue = cell.getValue();
        if (cellValue == cell.getOldValue()) return;
        // send PATCH request to update data
        // $[?(@.id==3)].name
        let body = new URLSearchParams();
        body.append('jsonpath', `$[?(@.id==${cell.getData().id})].${cell.getField()}`);
        body.append('value', cellValue);
        // TODO check for errors?
        fetch('/table-data', { method: 'PATCH', body });
    });
});