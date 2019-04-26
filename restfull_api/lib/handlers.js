const _data = require('./data')
const helpers = require('./helpers')
const config = require('./config')

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

                                        // delete each of the checks associated with the user
                                        const userChecks = typeof(data.checks) == 'object' && Array.isArray(data.checks) ? data.checks : []
                                        const checksToDelete = userChecks.length
                                        if (checksToDelete > 0) {
                                            let checksDeleted = 0
                                            let deletionErrors = false
                                            // loop through the checks
                                            userChecks.forEach(function(checkId) {
                                                // delete the check
                                                _data.delete('checks', checkId, function(err) {
                                                    if (err) {
                                                        deletionErrors = true
                                                    }
                                                    checksDeleted++
                                                    if (checksDeleted == checksToDelete) {
                                                        if (!deletionErrors) {
                                                            callback(200)
                                                        } else {
                                                            callback(500, {'Error': 'Errors encountered while attempting to delete users checks'})
                                                        }
                                                    }
                                                })
                                            })
                                        } else {
                                            callback(200)
                                        }

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

    // checks
    // end point that allows users to add, update, and delete server urls that they want to monitor
    checks: function(data, callback) {
        const acceptableMethods = ['post', 'get', 'put', 'delete']
        if (acceptableMethods.indexOf(data.method) > -1) {
            handlers._checks[data.method](data, callback)
        } else {
            callback(405)
        }
    },

    _checks: {
        // post
        // required data: protocol, url, method, successCode, timeoutSeconds, token
        post: function(data, callback) {
            // validate inputs
            const protocol = typeof(data.payload.protocol) == 'string' && ['https', 'http'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false
            const url = typeof(data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false
            const method = typeof(data.payload.method) == 'string' && ['post', 'put', 'get', 'delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false
            const successCodes = typeof(data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false
            const timeoutSeconds = typeof(data.payload.timeoutSeconds) == 'number' && Number.isInteger(data.payload.timeoutSeconds) && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false

            if (protocol && url && method && successCodes && timeoutSeconds) {
                // get the token from headers to confirm user is logged and authorized
                const token = typeof(data.headers.token) == 'string' ? data.headers.token : false

                // lookup the user by reading the token
                _data.read('tokens', token, function(err, tokenData) {
                    if (!err) {
                        const userPhone = tokenData.phone

                        // look up the user data
                        _data.read('users', userPhone, function(err, userData) {
                            if (!err) {
                                const userChecks = typeof(userData.checks) == 'object' && Array.isArray(userData.checks) ? userData.checks : []

                                // verify that the user has less than the number of max-checks per user
                                if (userChecks.length < config.maxChecks) {
                                    // create a random id for the check
                                    const checkId = helpers.createRandomString(20)
                                    // create the check object and include the users phone
                                    const checkObject = {
                                        id: checkId,
                                        userPhone,
                                        protocol,
                                        url,
                                        method,
                                        successCodes,
                                        timeoutSeconds
                                    }

                                    // save the object
                                    _data.create('checks', checkId, checkObject, function(err) {
                                        if (!err) {
                                            // add the check id to the users object
                                            userData.checks = userChecks
                                            userData.checks.push(checkId)

                                            // save the new user data
                                            _data.update('users', userPhone, userData, function(err) {
                                                if (!err) {
                                                    // return the data about the new check
                                                    callback(200, checkObject)
                                                } else {
                                                    callback(500, {'Error': 'could not update the user with the new check'})
                                                }
                                            })

                                        } else {
                                            callback(500, {'Error': 'Could not create the new check'})
                                        }
                                    })
                                } else {
                                    callback(400, {'Error': `User already has the maximum number of checks which is ${config.maxChecks}`})
                                }
                            } else {
                                callback(403)
                            }
                        })
                    } else {
                        callback(403)
                    }
                })
            } else {
                callback(400, {'Error': 'Missing required inputs or inputs are invalid'})
            }
        },

        // check - get
        // required: id, token
        get: function(data, callback) {
            // validate the id provided
            const id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false
            if (id) {
                // lookup the check
                _data.read('checks', id, function(err, checkData) {
                    if (!err && checkData) {

                        // get the token from the headers
                        const token = typeof(data.headers.token) == 'string' ? data.headers.token : false

                        // verify that the given token is valid and belongs to the user that created the check
                        handlers._tokens.verifyToken(token, checkData.userPhone, function(tokenIsValid) {

                            if (tokenIsValid) {

                               // return the check data
                                callback(200, checkData)

                            } else {
                                callback(403)
                            }
                        })

                    } else {
                        callback(404)
                    }
                })

            } else {
                callback(400, {'Error': 'Missing required field'})
            }
        },

        // checks - put
        // required: id
        // optional(at least one): protocol, url, successCodes, timeoutSeconds
        put: function(data, callback) {
            // validate required data
            const id = typeof(data.payload.id) == 'string' && data.payload.id.trim().length == 20 ? data.payload.id.trim() : false
            // validate optional data
            const protocol = typeof(data.payload.protocol) == 'string' && ['https', 'http'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false
            const url = typeof(data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false
            const method = typeof(data.payload.method) == 'string' && ['post', 'put', 'get', 'delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false
            const successCodes = typeof(data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false
            const timeoutSeconds = typeof(data.payload.timeoutSeconds) == 'number' && Number.isInteger(data.payload.timeoutSeconds) && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false

            // check to make sure id is valid
            if (id) {
                if (protocol || url || method || successCodes || timeoutSeconds) {

                    // lookup the checks
                    _data.read('checks', id, function(err, checkData) {

                        if (!err && checkData) {

                            // get the token from the headers
                            const token = typeof(data.headers.token) == 'string' ? data.headers.token : false

                            // verify that the given token is valid and belongs to the user that created the check
                            handlers._tokens.verifyToken(token, checkData.userPhone, function(tokenIsValid) {

                                if (tokenIsValid) {

                                    // update the check values where necessary
                                    if (protocol) {
                                        checkData.protocol = protocol
                                    }

                                    if (url) {
                                        checkData.url = url
                                    }

                                    if (method) {
                                        checkData.method = method
                                    }

                                    if (successCodes) {
                                        checkData.successCodes = successCodes
                                    }

                                    if (timeoutSeconds) {
                                        checkData.timeoutSeconds = timeoutSeconds
                                    }

                                    // store the new udpates
                                    _data.update('checks', id, checkData, function(err) {
                                        if (!err) {
                                            callback(200)
                                        } else {
                                            callback(500, {'Error': 'Could not update the check'})
                                        }
                                    })

                                } else {
                                    callback(403)
                                }
                            })

                        } else {
                            callback(400, {'Error': 'check id did not exist'})
                        }
                    })
                } else {
                   callback(400, {'Error': 'Missing fields to update'})
                }
            } else {
                callback(400, {'error': 'Missing required field'})
            }
        },

        // checks - delete
        // required: id
        delete: function(data, callback) {
            // validate the phone number provided
            const id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false
            if (id) {

                // look up the check
                _data.read('checks', id, function(err, checkData) {
                    if (!err && checkData) {

                        // get the token from the headers
                        const token = typeof(data.headers.token) == 'string' ? data.headers.token : false

                        // verify that the given token is valid for the phone number
                        handlers._tokens.verifyToken(token, checkData.userPhone, function(tokenIsValid) {
                            if (tokenIsValid) {

                                // delete the check data
                                _data.delete('checks', id, function(err) {
                                    if (!err) {

                                        // confirm this user exists
                                        _data.read('users', checkData.userPhone, function(err, userData) {
                                            if (!err && userData) {

                                                const userChecks = typeof(userData.checks) == 'object' && Array.isArray(userData.checks) ? userData.checks : []

                                                // remove the deleted check from the users list of checks
                                                const checkPosition = userChecks.indexOf(id)
                                                if (checkPosition > -1) {
                                                    userChecks.splice(checkPosition, 1)

                                                    // resave the users data
                                                    _data.update('users', checkData.userPhone, userData, function(err) {
                                                        if (!err) {
                                                            callback(200)
                                                        } else {
                                                            callback(500, {'Error': 'Could not update the user data'})
                                                        }
                                                    })

                                                } else {
                                                    callback(500, {'Error': 'Could not find the check on the users object so could not remove it'})
                                                }

                                            } else {
                                                callback(500, {'Error': 'Could not find the user who created the check'})
                                            }
                                        })

                                    } else {
                                        callback(500, {'Error': 'Could not delete the check data'})
                                    }
                                })

                            } else {
                                callback(403)
                            }
                        })

                    } else {
                        callback(400, {'Error': 'The specified check id does not exist'})
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