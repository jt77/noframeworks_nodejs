const _data = require('./data')
const helpers = require('./helpers')

// define the handlers
const handlers = {
    // ping handler
    users: function(data, callback) {
        const acceptableMethods = ['post', 'get', 'put', 'delete']
        if (acceptableMethods.indexOf(data.method) > -1) {
            handlers._users[data.method](data, callback)
        } else {
            callback(405)
        }
    },

    _users: {
        post: function(data, callback) {

            // confirm all required fields were provided
            const firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false
            const lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false
            const phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false
            const password = typeof(data.payload.password) == 'string' && data.payload.phone.trim().length > 0 ? data.payload.password.trim() : false
            const tosAgreement = typeof(data.payload.tosAgreement) == 'boolean' && data.payload.tosAgreement == true ? true : false

            if (firstName && lastName && phone && password && tosAgreement) {

                // confirm sure user doesn't already exist
                // by checking if the _data.read returns an
                // error that indicates the user could not
                // be found
                _data.read('users', phone, function(err, data) {
                    if (err) {
                        // hash password
                        const hashedPassword = helpers.hash(password)
                        // create the user object
                        if (hashedPassword) {
                            const userObject = {
                                firstName,
                                lastName,
                                phone,
                                hashedPassword,
                                tosAgreement
                            }
                            // store the user to disk
                            _data.create('users', phone, userObject, function (err) {
                                if (!err) {
                                    callback(200)
                                } else {
                                    console.log(err)
                                    callback(500, {'Error': 'Could not create the new user'})
                                }
                            })
                        } else {
                            callback(500, {'Error': 'Could not hash the provided password'})
                        }
                    } else {
                        callback(400, {'Error': 'A user with that phone number already exists'})
                    }
                })

            } else {
                callback(400, {'Error': 'Missing required fields'})
            }
        },
        /**
         *
         * @param data
         * @param callback
         * @TODO only let authenticated users access their data.
         * The get request handler expects to receive the required data
         * from the query string NOT from the JSON payload
         */
        get: function(data, callback) {
            // validate the phone number provided
            const phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false
            if (phone) {
                _data.read('users', phone, function(err, data) {
                    if (!err && data) {
                        // remove the hashed password from the user object before returning it to the requester
                        delete data.hashedPassword
                        callback(200, data)
                    } else {
                        callback(404)
                    }
                })
            } else {
                callback(400, {'Error': 'Missing required field'})
            }
        },
        /**
         *
         * @param data
         * @param callback
         * @TODO only let authenticated user update their own data
         * For this route the required request data is: phone, AND at least 1 of: firstName, lastName, password
         */
        put: function(data, callback) {
            // validate required data
            const phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false
            // validate optional data
            const firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false
            const lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false
            const password = typeof(data.payload.password) == 'string' && data.payload.phone.trim().length > 0 ? data.payload.password.trim() : false

            if (phone) {
                if (firstName || lastName || password) {
                    _data.read('users', phone, function(err, userData) {
                        if (!err && userData) {
                            if (firstName) {
                                userData.firstName = firstName
                            }
                            if (lastName) {
                                userData.lastName = lastName
                            }
                            if (password) {
                                userData.hashedPassword = helpers.hash(password)
                            }
                            _data.update('users', phone, userData, function(err) {
                                if (!err) {
                                    callback(200)
                                } else {
                                    console.log(err)
                                    callback(500, {'Error': 'Could not update the user'})
                                }
                            })
                        } else {
                            callback(400, {'Error': 'The specified user does not exist'})
                        }
                    })
                } else {
                    callback(400, {'Error': 'Missing fields to update'})
                }
            } else {
                callback(400, {'Error': 'Missing required field'})
            }
        },
        /**
         *
         * @param data
         * @param callback
         * @TODO only let authenticated user to delete their data
         * @TODO clenaup any other data files associated with this user
         * this route has 1 required field from the request: phone
         */
        delete: function(data, callback) {
            // validate the phone number provided
            const phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false
            if (phone) {
                // confirm this user exists
                _data.read('users', phone, function(err, data) {
                    if (!err && data) {
                        _data.delete('users', phone, function(err) {
                            if (!err) {
                                callback(200)
                            } else {
                                callback(500, {'Error': 'Could not delete this user'})
                            }
                        })
                    } else {
                        callback(404, {'Error': 'Could not find this user'})
                    }
                })
            } else {
                callback(400, {'Error': 'Missing required field'})
            }
        }
    },

    ping: function(data, callback) {
        // callback a http status code and a payload object
        callback(200);
    },

    // not found handler
    notFound: function(data, callback) {
        callback(404);
    }
};

module.exports = handlers