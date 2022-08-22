var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var debug = require('debug')('kerwal-data-table:server');
var http = require('http');

class WebDataTableServer {
    constructor(config = {}) {
        this.config = {};
        this.config.port = config.port || 3000;
        this.config.host = config.host || "";
        this.config.table_data_path = config.table_data_path || "./table-data.json";
        this.config.table_config_path = config.table_config_path || "./table-config.js";

        // setup the express app
        this.app = express();
        this.app.set('config', this.config);
        this.app.use(logger('dev'));
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: false }));
        this.app.use(cookieParser());
        this.app.use(express.static(path.join(__dirname, 'content'), { index: 'index.htm' }));
        this.app.use('/table-data', require('./table-data-route.js')(this.config));
        this.app.use('/table-config.js', require('./table-config-route.js')(this.config));

        this.server = http.createServer(this.app);
    }

    start() {
        this.server.on('error', (error) => {
            if (error.syscall !== 'listen') {
                throw error;
            }

            var bind = typeof this.config.port === 'string'
                ? 'Pipe ' + this.config.port
                : 'Port ' + this.config.port;

            // handle specific listen errors with friendly messages
            switch (error.code) {
                case 'EACCES':
                    console.error(bind + ' requires elevated privileges');
                    process.exit(1);
                    break;
                case 'EADDRINUSE':
                    console.error(bind + ' is already in use');
                    process.exit(1);
                    break;
                default:
                    throw error;
            }
        });

        this.server.on('listening', () => {
            var addr = this.server.address();
            var bind = typeof addr === 'string'
                ? 'pipe ' + addr
                : 'port ' + addr.port;
            debug('Listening on ' + bind);
        });

        /**
         * Listen on provided port, on all network interfaces.
         */

        this.server.listen(this.config.port, this.config.host);
    }
}

module.exports = { WebDataTableServer }