/*
library for storing and editing data
 */

const fs = require('fs');
const path = require('path');

const helpers = require('./helpers')


// container for the module
const lib = {};

// base directory of the data
lib.baseDir = path.join(__dirname, '/../.data/');

// write data to a file
// convention is to use the error back pattern for callbacks where the
// first argument passed is a flag designating whether or not there was an error
lib.create = function(dir, fileName, data, callback) {

    // create a new file AND open the file for writing
    fs.open(`${lib.baseDir}${dir}/${fileName}.json`, 'wx', function(err, fileDescriptor) {

        // if there was no error and the file did NOT already exist
        if (!err && fileDescriptor) {

            // convert data to string
            var stringData = JSON.stringify(data);

            // write to file and close it
            fs.writeFile(fileDescriptor, stringData, function(err) {

                if (!err) {
                    fs.close(fileDescriptor, function(err) {

                        if (!err) {
                            callback(false);
                        } else {
                            callback('error closing new file')
                        }
                    })

                } else {
                    callback('error writing to new file')
                }
            })
        } else {
            callback('could not create new file, it may already exist');
        }
    })
}

// read data from a file
lib.read = function(dir, filename, callback) {
    fs.readFile(`${lib.baseDir}${dir}/${filename}.json`, 'utf8', function(err, data) {
        if (!err && data) {
            const parsedData = helpers.parseJsonToObject(data)
            callback(false, parsedData)
        } else {
            callback(err, data);
        }
    })
}

// update data inside an existing file
lib.update = function(dir, filename, data, callback) {

    // open an existing file for writing
    fs.open(`${lib.baseDir}${dir}/${filename}.json`, 'r+', function(err, fileDescriptor) {

        if(!err && fileDescriptor) {

            const stringData = JSON.stringify(data);

            // truncate the file which removes the old data so its clean to add new data
            fs.truncate(fileDescriptor, function(err) {

                if (!err) {

                    // write to the file
                    fs.writeFile(fileDescriptor, stringData, function(err) {

                        if (!err) {

                            // close the file
                            fs.close(fileDescriptor, function(err) {
                                if (!err) {
                                    callback(false)
                                } else {
                                    callback('error closing existing file')
                                }
                            })
                        } else {
                            console.log('error writing to existing file')
                        }
                    })
                } else {
                    callback('error truncating file')
                }
            })
        } else {
            callback('could not open the file for updating, it may not exist yet.')
        }
    })
}

// delete a file
lib.delete = function(dir, filename, callback) {
    // unlink or remove the file from the system
    fs.unlink(`${lib.baseDir}${dir}/${filename}.json`, err => {
        if (!err) {
            callback(false)
        } else {
            console.log('error deleting the file')
        }
    })
}

// list all the items in a directory
lib.list = function(dir, callback) {
    fs.readdir(`${lib.baseDir}${dir}/`, function(err, data) {
        if (!err && data && data.length > 0) {
            let trimmedFileNames = []
            data.forEach(fileName => {
                trimmedFileNames.push(fileName.replace('.json', ''))
            })
            callback(false, trimmedFileNames)
        } else {
            callback(err, data)
        }
    })
}

module.exports = lib;