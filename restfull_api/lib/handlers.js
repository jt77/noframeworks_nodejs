const _data = require('./data')
const helpers = require('./helpers')

// define the handlers
const handlers = {

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
         * The get request handler expects to receive the required data
         * from the query string NOT from the JSON payload
         */
        get: function(data, callback) {
            // validate the phone number provided
            const phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false
            if (phone) {

                // get the token from the headers
                const token = typeof(data.headers.token) == 'string' ? data.headers.token : false

                // verify that the given token is valid for the phone number
                handlers._tokens.verifyToken(token, phone, function(tokenIsValid) {

                    if (tokenIsValid) {

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
                        callback(403, {'Error': 'Missing required token in header or token is invalid'})
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

                    // get the token from the headers
                    const token = typeof(data.headers.token) == 'string' ? data.headers.token : false

                    // verify that the given token is valid for the phone number
                    handlers._tokens.verifyToken(token, phone, function(tokenIsValid) {

                        if (tokenIsValid) {

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
                            callback(403, {'Error': 'Missing required token in header or token is invalid'})
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
         * @TODO clenaup any other data files associated with this user
         * this route has 1 required field from the request: phone
         */
        delete: function(data, callback) {
            // validate the phone number provided
            const phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false
            if (phone) {

                // get the token from the headers
                const token = typeof(data.headers.token) == 'string' ? data.headers.token : false

                // verify that the given token is valid for the phone number
                handlers._tokens.verifyToken(token, phone, function(tokenIsValid) {
                    if (tokenIsValid) {

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
                        callback(403, {'Error': 'Missing required token in header or token is invalid'})
                    }
                })

            } else {
                callback(400, {'Error': 'Missing required field'})
            }
        }
    },

    // Tokens
    tokens: function(data, callback) {
        const acceptableMethods = ['post', 'get', 'put', 'delete']
        if (acceptableMethods.indexOf(data.method) > -1) {
            handlers._tokens[data.method](data, callback)
        } else {
            callback(405)
        }
    },

    _tokens: {

        // Tokens - post
        // Required: phone, password
        post: function(data, callback) {
            // confirm all required fields were provided
            const phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false
            const password = typeof(data.payload.password) == 'string' && data.payload.phone.trim().length > 0 ? data.payload.password.trim() : false

            if (phone && password) {
                // lookup the user who matches that phone number
                _data.read('users', phone, function(err, userData) {
                    if (!err && userData) {
                        // hash the sent password, and compare it to the password stored in the user object
                        const hashedPassword = helpers.hash(password)
                        if (hashedPassword == userData.hashedPassword) {
                            // if valid password, create a new token with a random name. set expiration date 1 hour into the future
                            const tokenId = helpers.createRandomString(20)
                            const expires = Date.now() + 1000 * 60 * 60
                            const tokenObject = {
                                'phone': phone,
                                'id': tokenId,
                                'expires': expires
                            }

                            // store the token
                            _data.create('tokens', tokenId, tokenObject, function(err) {
                                if (!err) {
                                    callback(200, tokenObject)
                                } else {
                                    callback(500, {'Error': 'Could not create the new token'})
                                }
                            })
                        } else {
                            callback(400, {'Error': 'Password did not match the specified users stored password'})
                        }
                    } else {
                        callback(400, {'Error': 'Could not find the specified user'})
                    }
                })
            } else {
                callback(400, {'Error': 'Missing required field(s)'})
            }
        },

        // Tokens - get
        // Required: id
        get: function(data, callback) {
            // validate the id
            const id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false
            if (id) {
                // lookup the token
                _data.read('tokens', id, function(err, tokenData) {
                    if (!err && tokenData) {
                        // remove the hashed password from the user object before returning it to the requester
                        callback(200, tokenData)
                    } else {
                        callback(404)
                    }
                })
            } else {
                callback(400, {'Error': 'Missing required field'})
            }
        },

        // Token - put
        // Required: id, extend
        put: function(data, callback) {
            const id = typeof(data.payload.id) == 'string' && data.payload.id.trim().length == 20 ? data.payload.id.trim() : false
            const extend = typeof(data.payload.extend) == 'boolean' && data.payload.extend == true ? true : false
            if (id && extend) {
                // lookup the token
                _data.read('tokens', id, function(err, tokenData) {
                    if (!err && tokenData) {
                        // check to make sure the token isn't already expired
                        if (tokenData.expires > Date.now()) {

                            // reset the token to expire an hour from now
                            tokenData.expires = Date.now() + 1000 * 60 * 60

                            // store the new token updates
                            _data.update('tokens', id, tokenData, function(err) {
                                if (!err) {
                                    callback(200)
                                } else {
                                    callback(500, {'Error': 'Could not update the tokens expiration'})
                                }
                            })
                        } else {
                            callback(400, {'Error': 'The token has already expired and cannot be extended'})
                        }
                    } else {
                        callback(400, {'Error': 'Specified token does not exists'})
                    }
                })
            } else {
                callback(400, {'Error': 'Missing required fields or fields are invalid'})
            }
        },

        // Tokens - delete
        // Required: id
        delete: function(data, callback) {
            // validate the phone number provided
            const id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false
            if (id) {
                // confirm this token exists
                _data.read('tokens', id, function(err, data) {
                    if (!err && data) {
                        _data.delete('tokens', id, function(err) {
                            if (!err) {
                                callback(200)
                            } else {
                                callback(500, {'Error': 'Could not delete the token'})
                            }
                        })
                    } else {
                        callback(404, {'Error': 'Could not find the token'})
                    }
                })
            } else {
                callback(400, {'Error': 'Missing required field'})
            }
        },

        // verifies if a given a token id is currently valid for a given user
        verifyToken: function(id, phone, callback) {
            // lookup the token
            _data.read('tokens', id, function(err, tokenData) {
                if (!err && tokenData) {
                    // check that the provided token belongs to the provided user and had not expired
                    if (tokenData.phone == phone && tokenData.expires > Date.now()) {
                        callback(true)
                    } else {
                        callback(false)
                    }
                } else {
                    callback(false)
                }
            })
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