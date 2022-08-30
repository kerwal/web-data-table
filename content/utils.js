function pickFile(extensions) {
    return new Promise((resolve) => {
        var input = document.createElement("input");
        input.type = "file";
        input.accept = extensions;

        input.addEventListener("change", (e) => {
            resolve(input.files[0]);
        });

        input.click();
    });
}

/**
* Read up to and including |maxlines| lines from |file|.
*
* @param {Blob} file - The file to be read.
* @param {integer} maxlines - The maximum number of lines to read.
* @return {Promise}
*/
function readFileMaxLines(file, maxlines) {
    var CHUNK_SIZE = 4096; // a typical sector size
    var decoder = new TextDecoder();
    var offset = 0;
    var linecount = 0;
    var dresults = '';
    var fileReader = new FileReader();
    var fileContents = '';

    return new Promise((resolve, reject) => {
        fileReader.onload = function () {
            // Use stream:true in case we cut the file
            // in the middle of a multi-byte character
            dresults += decoder.decode(fileReader.result, { stream: true });
            var lines = dresults.split('\n');
            dresults = lines.pop(); // In case the line did not end yet.
            linecount += lines.length;

            if (linecount > maxlines) {
                // Read too many lines? Truncate the results.
                lines.length -= linecount - maxlines;
                linecount = maxlines;
            }

            for (var i = 0; i < lines.length; ++i) {
                fileContents += (fileContents === '' ? '' : "\n") + lines[i];
            }
            offset += CHUNK_SIZE;
            seek();
        };
        fileReader.onerror = function () {
            reject(fileReader.error);
        };
        seek();

        function seek() {
            if (linecount === maxlines) {
                // We found enough lines.
                resolve(fileContents); // Done
                return;
            }
            if (offset !== 0 && offset >= file.size) {
                // We did not find all lines, but there are no more lines.
                fileContents += dresults; // This is from lines.pop(), before.
                resolve(fileContents); // Done
                return;
            }
            var slice = file.slice(offset, offset + CHUNK_SIZE);
            fileReader.readAsArrayBuffer(slice);
        }
    });
}

function csvParser(text) {
    var data = [],
        row = 0,
        col = 0,
        inQuote = false;

    //Iterate over each character
    for (let index = 0; index < text.length; index++) {
        let char = text[index],
            nextChar = text[index + 1];

        //Initialize empty row
        if (!data[row]) {
            data[row] = [];
        }

        //Initialize empty column
        if (!data[row][col]) {
            data[row][col] = "";
        }

        //Handle quotation mark inside string
        if (char == '"' && inQuote && nextChar == '"') {
            data[row][col] += char;
            index++;
            continue;
        }

        //Begin / End Quote
        if (char == '"') {
            inQuote = !inQuote;
            continue;
        }

        //Next column (if not in quote)
        if (char == ',' && !inQuote) {
            col++;
            continue;
        }

        //New row if new line and not in quote (CRLF) 
        if (char == '\r' && nextChar == '\n' && !inQuote) {
            col = 0;
            row++;
            index++;
            continue;
        }

        //New row if new line and not in quote (CR or LF) 
        if ((char == '\r' || char == '\n') && !inQuote) {
            col = 0;
            row++;
            continue;
        }

        //Normal Character, append to column
        data[row][col] += char;
    }

    return data;
}

function structureData(table, parsed) {
    var data = [];

    if (Array.isArray(parsed) && parsed.length && Array.isArray(parsed[0])) {
        if (table.options.autoColumns) {
            data = structureArrayToObject(parsed);
        } else {
            data = structureArrayToColumns(table, parsed);
        }

        return data;
    } else {
        return parsed;
    }
}

function structureArrayToObject(parsed) {
    var columns = parsed.shift();

    var data = parsed.map((values, index) => {
        var row = {};

        columns.forEach((key, i) => {
            row[key] = values[i];
        });

        return row;
    });

    return data;
}

function structureArrayToColumns(table, parsed) {
    var data = [],
        columns = table.getColumns();

    //remove first row if it is the column names
    if (columns[0] && parsed[0][0]) {
        if (columns[0].getDefinition().title === parsed[0][0]) {
            parsed.shift();
        }
    }

    //convert row arrays to objects
    parsed.forEach((rowData) => {
        var row = {};

        rowData.forEach((value, index) => {
            var column = columns[index];

            if (column) {
                row[column.getField()] = value;
            }
        });

        data.push(row);
    });

    return data;
}

function readFileContents(file) {
    return new Promise((resolve, reject) => {
        let reader = new FileReader();

        reader.onload = (e) => {
            resolve(reader.result);
        };

        reader.onerror = (e) => {
            console.warn("File Load Error - Unable to read file");
            reject(e);
        };

        reader.readAsText(file);
    });
}

function openFilePicker(accept) {
    return new Promise((resolve) => {
        var input = document.createElement("input");
        input.type = "file";
        input.accept = accept;

        input.addEventListener("change", (e) => {
            resolve(input.files[0]);
            input.remove();
        });

        input.click();
    });
}

function importCsv(table, contents) {
    return csvParser(contents)
        .then(parsed => structureData(table, parsed))
        .then(data => table.setData(data))
        .catch((err) => {
            console.error("Import Error:", err || "Unable to import file");
            return Promise.reject(err);
        });
}

define(function () {
    return {
        openFilePicker,
        importCsv,
        readFileContents,
        readFileMaxLines
    }
});