/*
    worker related tasks
    this file contains the main logic for the background workers
    that will start and continuously run in the background whenever
    the server is started up. these workers essentially perform the
    required checks on the servers that users set up to be monitored.
 */

// dependencies
const path  = require('path')
const fs = require('fs')
const https = require('https')
const http = require('http')
const url = require('url')

const _data = require('./data')
const helpers = require('./helpers')
const _logs = require('./logs')


// instantiate the worker object
const workers = {}


// lookup all checks and get their data and send to a validator
workers.gatherAllChecks = () => {
    // get all the checks
    _data.list('checks', (err, checks) => {
        if (!err && checks && checks.length > 0) {
            checks.forEach(check => {
                // read in the check data
                _data.read('checks', check, (err, originalCheckData) => {
                    if (!err && originalCheckData) {
                        // pass check data to the check validator and let that function continue or log errors as needed
                        workers.validateCheckData(originalCheckData)

                    } else {
                        console.log('Error reading one of the checks data')
                    }
                })
            })
        } else {
            console.log('Error: could not find any checks to process')
        }
    })
}


// sanity checking the check data
workers.validateCheckData = originalCheckData => {
    originalCheckData = typeof(originalCheckData) == 'object' && originalCheckData !== null ? originalCheckData : {}
    originalCheckData.id = typeof(originalCheckData.id) == 'string' && originalCheckData.id.trim().length == 20 ? originalCheckData.id.trim() : false
    originalCheckData.userPhone = typeof(originalCheckData.userPhone) == 'string' && originalCheckData.userPhone.trim().length == 10 ? originalCheckData.userPhone.trim() : false
    originalCheckData.protocol = typeof(originalCheckData.protocol) == 'string' && ['http', 'https'].indexOf(originalCheckData.protocol) > -1 ? originalCheckData.protocol : false
    originalCheckData.url = typeof(originalCheckData.url) == 'string' && originalCheckData.url.trim().length > 0 ? originalCheckData.url.trim() : false
    originalCheckData.method = typeof(originalCheckData.method) == 'string' && ['post', 'get', 'put', 'delete'].indexOf(originalCheckData.method) > -1 ? originalCheckData.method : false
    originalCheckData.successCodes = Array.isArray(originalCheckData.successCodes) && originalCheckData.successCodes.length > 0 ? originalCheckData.successCodes : false
    originalCheckData.timeoutSeconds = Number.isInteger(originalCheckData.timeoutSeconds) && originalCheckData.timeoutSeconds >= 1 && originalCheckData.timeoutSeconds <= 5 ? originalCheckData.timeoutSeconds : false

    // set the keys that may not be set if the workers have never seen this check before
    originalCheckData.state = typeof(originalCheckData.state) == 'string' && ['up', 'down'].indexOf(originalCheckData.state) > -1 ? originalCheckData.state : 'down'
    originalCheckData.lastChecked = Number.isInteger(originalCheckData.lastChecked) && originalCheckData.lastChecked > 0 ? originalCheckData.lastChecked : false

    // if all the checks pass pass the data along to the next step in the process
    if (
        originalCheckData.id &&
        originalCheckData.userPhone &&
        originalCheckData.protocol &&
        originalCheckData.url &&
        originalCheckData.method &&
        originalCheckData.successCodes &&
        originalCheckData.timeoutSeconds
    ) {

        workers.performCheck(originalCheckData)

    } else {
        console.log('Error: One of the checks is not properly formatted. skipping it.`')
    }
}


// perform the check. send the originalCheckData and outcome of the check process to the next step in the process
workers.performCheck = (originalCheckData) => {
    // prepare the initial check outcome
    const checkOutcome = {
        error: false,
        responseCode: false,
    }

    // mark that the outcome has not been sent yet
    let outcomeSent = false

    // parse the host name and the path out of the original check data
    const parsedUrl = url.parse(`${originalCheckData.protocol}://${originalCheckData.url}`, true)
    const hostName = parsedUrl.hostname
    // using path and not the "pathname" because we want the query string
    const path = parsedUrl.path

    // construct the request
    const requestDetails = {
        protocol: originalCheckData.protocol + ':',
        hostname: hostName,
        method: originalCheckData.method.toUpperCase(),
        path: path,
        timeout: originalCheckData.timeoutSeconds * 1000 // converting to milliseconds
    }

    // instantiate the request object using  ether the http or https module
    const _moduleToUse = originalCheckData.protocol == 'http' ? http : https
    const req = _moduleToUse.request(requestDetails, res => {
        // grab the status of the sent request
        const status = res.statusCode

        // update the checkOutcome and pass the data along
        checkOutcome.responseCode = status

        if (!outcomeSent) {
            workers.processCheckOutcome(originalCheckData, checkOutcome)
            outcomeSent = true
        }
    })

    // bind to the error event so that it doesn't get thrown
    req.on('error', e => {
        // update the checkOutcome and pass the data along
        checkOutcome.error = {
            error: true,
            value: e,
        }

        if (!outcomeSent) {
            workers.processCheckOutcome(originalCheckData, checkOutcome)
            outcomeSent = true
        }
    })

    // bind to the timout event
    req.on('timeout', e => {
        // update the checkOutcome and pass the data along
        checkOutcome.error = {
            error: true,
            value: 'timeout',
        }

        if (!outcomeSent) {
            workers.processCheckOutcome(originalCheckData, checkOutcome)
            outcomeSent = true
        }
    })

    // send or end the request
    req.end()

}

// process the check outcome and update the check data as need  and trigger an alert if needed
// special logic for accommodating a check that has never been tested before.  we don't want to alert on that one
workers.processCheckOutcome = (originalCheckData, checkOutcome) => {
    // decide if the check is considered up or down
    const state = !checkOutcome.error && checkOutcome.responseCode && originalCheckData.successCodes.indexOf(checkOutcome.responseCode) > -1 ? 'up' : 'down'

    // decide if an sms alert is warranted
    const alertWarranted = originalCheckData.lastChecked && originalCheckData.state != state ? true : false

    // log the outcome
    const timeOfCheck = Date.now()
    workers.log(originalCheckData, checkOutcome, state, alertWarranted, timeOfCheck)

    // update the check data
    const newCheckData = originalCheckData
    newCheckData.state = state
    newCheckData.lastChecked = timeOfCheck

    // save the updates
    _data.update('checks', newCheckData.id, newCheckData, err => {
        if (!err) {
            // send the new check data to the next phase in the process if needed
            if (alertWarranted) {
                workers.alertUserToStatusChange(newCheckData)
            } else {
                console.log('check out has not changed no alert needed')
            }
        } else {
            console.log('Error: trying to save updates to one of the checks')
        }
    })
}


// alert the user as a change is their check status
workers.alertUserToStatusChange = newCheckData => {
    const msg = `Alert: Your check for ${newCheckData.method.toUpperCase()} ${newCheckData.protocol}://${newCheckData.url} is currently ${newCheckData.state}`

    helpers.sendTwilioSms(newCheckData.userPhone, msg, (err, callback) => {
        if (!err) {
            console.log('Success: User was alerted to a status change in their check via sms', msg)
        } else {
            console.log('Error: could not send sms alert to user who has a state change in their check')
        }
    })
}


workers.log = function(originalCheckData, checkOutcome, state, alertWarranted, timeOfCheck) {
    // form the log data
    const logData = {
        check: originalCheckData,
        outcome: checkOutcome,
        state,
        alert: alertWarranted,
        time: timeOfCheck
    }

    // convert data to a string
    const logString = JSON.stringify(logData)

    // determine the name of the log file
    const logFileName = originalCheckData.id

    // append the log string to the file
    _logs.append(logFileName, logString, function(err) {
        if (!err) {
            console.log('logging to the file succeeded')
        } else {
            console.log('logging to the file failed')
        }
    })
}


// timer to execute the worker process once per minute
workers.loop = () => {
    setInterval(() => {
        workers.gatherAllChecks()
    }, 1000 * 60)
}

// rotate/compress the log files
workers.rotateLogs = function() {
    // list all the non compressed log files
    _logs.list(false, function(err, logs) {

        if (!err && logs && logs.length > 0) {
            logs.forEach(logName => {

                // compress the data to a different file
                const logId = logName.replace('.log', '')
                const newFileId = `${logId}-${Date.now()}`

                _logs.compress(logId, newFileId, function(err) {
                    if (!err) {
                        // clear the log file after sending its content to a compressed file
                        // to prepare it to receive fresh data
                        _logs.truncate(logId, function(err) {
                            if (!err) {
                                console.log('success truncating log file')
                            } else {
                                console.log('error truncating log file')
                            }
                        })
                    } else {
                        console.log('error compressing one of the log files', err)
                    }
                })
            })
        } else {
            console.log('error: could not file any logs to compress')
        }
    })
}

// timer to execute the log rotation process once per day
workers.logRotationLoop = function() {
    setInterval(() => {
        workers.rotateLogs()
    }, 1000 * 60 * 60 * 24) // once per day
}


// init script
workers.init = function() {
    // execute all the checks immediately
    workers.gatherAllChecks()

    // call the loop so the checks will execute later on
    workers.loop()

    // compress all the logs immediately
    workers.rotateLogs()

    // cal the compression loops so logs will be compressed later on
    workers.logRotationLoop()
}


module.exports = workers