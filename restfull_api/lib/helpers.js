/**
 helper functions
 */

const crypto = require('crypto')
const config = require('./config')
const querystring = require('querystring')
const https = require('https')

const helpers = {

    hash: function(str) {
        if (typeof(str) == 'string' && str.length > 0) {
            return crypto.createHmac('sha256', config.hashingSecret).update(str).digest('hex')
        } else {
            return false
        }
    },

    /**
     *
     * @param str
     * @returns {JSON object}
     * Parse a JSON string to an object or return an empty object
     * if an error occurs.
     */
    parseJsonToObject: function(str) {
        try {
            return JSON.parse(str)
        } catch(e) {
            return {}
        }
    },

    /**
     *
     * @param strLength
     * create a string of random alphanumeric characters, of a given length
     */
    createRandomString: function(strLength) {

        strLength = typeof(strLength) == 'number' && strLength > 0 ? strLength : false

        if (strLength) {

            const possibleCharacters = 'abcdefghijklmnopqrstuvwxyz0123456789'
            let str = ''

            // generate the random string of the requested length
            for (let i = 1; i <= strLength; i++) {
                // get a random character from the possibleCharacters string
                const randomCharacter = possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length))
                // append this character to the final string
                str += randomCharacter
            }

            return str

        } else {
            return false
        }
    },

    // send an sms message via twilio
    sendTwilioSms: function(phone, msg, callback) {
        // validate parameters
        phone = typeof(phone) == 'string' && phone.trim().length == 10 ? phone.trim() : false
        msg = typeof(msg) == 'string' && msg.trim().length > 0 && msg.trim().length <= 1600 ? msg.trim() : false

        if (phone && msg) {
            // configure the request payload per Twilio's api requirements
            const payload = {
                'From': config.twilio.fromPhone,
                'To': '+1' + phone,
                'Body': msg
            }

            // stringify the payload
            const stringPayload = querystring.stringify(payload)

            // configure the request details per Twilio's api requirements
            const requestDetails = {
                'protocol': 'https:',
                'hostname': 'api.twilio.com',
                'method': 'POST',
                'path': '/2010-04-01/Accounts/' + config.twilio.accountSid + '/Messages.json',
                'auth': config.twilio.accountSid + ':' + config.twilio.authToken,
                'headers': {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': Buffer.byteLength(stringPayload) // Buffer is a globally accessible object
                }
            }

            // instantiate the request object
            const req = https.request(requestDetails, function(res) {
                // grab the status of the sent request
                const status = res.statusCode
                // call the callback if the request went through
                if (status == 200 || status == 201) {
                    callback(false)
                } else {
                    callback('Status code returned was ' + status)
                }
            })

            // bind to the error event so it doesn't get thrown
            req.on('error', function(e) {
                callback(e)
            })

            // add the payload to the request
            req.write(stringPayload)

            // send the request
            req.end()

        } else {
            callback('Given parameters were missing or invalid')
        }
    }
}



module.exports = helpers