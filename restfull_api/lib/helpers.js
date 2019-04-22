/**
 helper functions
 */

const crypto = require('crypto')
const config = require('./config')

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
    }
}

module.exports = helpers