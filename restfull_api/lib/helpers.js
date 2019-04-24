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
    }
}

module.exports = helpers