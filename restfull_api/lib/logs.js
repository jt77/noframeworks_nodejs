/*
    library for storing and rotating logs
 */

// dependencies
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')


// container for the module
const lib = {}

// base directory of the data
lib.baseDir = path.join(__dirname, '/../.logs/');

// append a string to a file. create the file if it does not exist
lib.append = function(file, str, callback) {
    // open the file for appending
    fs.open(`${lib.baseDir}${file}.log`, 'a', function(err, fileDescriptor) {
        if (!err) {
            // append to the file and close it
            fs.appendFile(fileDescriptor, str+'\n', function(err) {
                if (!err) {
                    fs.close(fileDescriptor, function(err) {
                        if (!err) {
                            callback(false)
                        } else {
                            callback('error closing file that was being appended to.')
                        }
                    })
                } else {
                    callback('error appending to file')
                }
            })
        } else {
            callback('could not open file for appending')
        }
    })
}

// list all the logs and optionally include the compressed logs
lib.list = function(includeCompressedLogs, callback) {
    fs.readdir(lib.baseDir, function(err, data) {
        if (!err && data && data.length > 0) {
            const trimmedFileNames = []
            data.forEach(function(fileName) {
                // add the .logs files
                if (fileName.indexOf('.log') > -1) {
                    trimmedFileNames.push(fileName.replace('.log', ''))
                }

                // optionally add the compressed files
                // we will use gzip and then base64 encode the files
                if (fileName.indexOf('.gs.b64') > -1 && includeCompressedLogs) {
                    trimmedFileNames.push(fileName.replace('.gz.b64', ''))
                }
            })
            callback(false, trimmedFileNames)
        } else {
            callback(err, data)
        }
    })
}

// compress the content of one .log file into a .gs.b64 file within the same directory
lib.compress = function(logId, newFileId, callback) {
    const sourceFile = logId + '.log'
    const destFile = newFileId + '.gs.b64'

    // read the source file
    fs.readFile(`${lib.baseDir}${sourceFile}`, 'utf8', function(err, inputString) {
        if (!err && inputString) {
            // compress the data using gzip
            zlib.gzip(inputString, function(err, buffer) {
                if (!err && buffer) {
                    // send the data to the destination file
                    fs.open(`${lib.baseDir}${destFile}`, 'wx', function(err, fileDescriptor) {
                        if (!err && fileDescriptor) {
                            // write to the destination file
                            fs.writeFile(fileDescriptor, buffer.toString('base64'), function(err) {
                                if (!err) {
                                    // close the destination file
                                    fs.close(fileDescriptor, function(err) {
                                        if (!err) {
                                            callback(false)
                                        } else {
                                            callback(err)
                                        }
                                    })
                                } else {
                                    callback(err)
                                }
                            })
                        } else {
                            callback(err)
                        }
                    })
                } else {
                    callback(err)
                }
            })
        } else {
            callback(err)
        }
    })
}

// decompress the content of a .gz.b64 file into a string variable
lib.decompress = function(fileId, callback) {
    const fileName = fileId + '.gz.b64'
    fs.readFile(`${lib.baseDir}${fileName}`, 'utf8', function(err, str) {
        if (!err && str) {
            // decompress the data
            const inputBuffer = Buffer.from(str, 'base64')
            zlib.unzip(inputBuffer, function(err, outputBuffer) {
                if (!err && outputBuffer) {
                    // convert file data buffer into string and send it back
                    const str = outputBuffer.toString()
                    callback(false, str)
                } else {
                    callback(err)
                }
            })
        } else {
            callback(err)
        }
    })
}

// clearing/truncating a log file
lib.truncate = function(logId, callback) {
    fs.truncate(`${lib.baseDir}${logId}.log`, 0, function(err){
        if (!err) {
            callback(false)
        } else {
            callback(err)
        }
    })
}

module.exports = lib