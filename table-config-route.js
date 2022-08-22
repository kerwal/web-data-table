module.exports = (config = {}) => {
    const express = require('express');
    var router = express.Router();

    if(!config.table_config_path) return router;

    router.get('/', function (req, res, next) {
        res.sendFile(config.table_config_path, {root: './'});
    });

    return router;
}
