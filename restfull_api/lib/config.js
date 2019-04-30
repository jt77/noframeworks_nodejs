/*
create and export configuration variables
 */

// container for all the environments
const environments = {

    // staging {default} environment
    staging : {
        'httpPort': 3000,
        'httpsPort': 3001,
        'envName': 'staging',
        'hashingSecret': 'thisIsASecretString',
        'maxChecks': 5,
        'twilio' : {
            'accountSid' : 'ACb32d411ad7fe886aac54c665d25e5c5d',
            'authToken' : '9455e3eb3109edc12e3d8c92768f7a67',
            'fromPhone' : '+15005550006'
        }
    },

    // production environment
    production : {
        'httpPort': 5000,
        'httpsPort': 5001,
        'envName': 'production',
        'hashingSecret': 'thisIsASecretString',
        'maxChecks': 5,
        'twilio': {
            'accountSid': '',
            'authToken': '',
            'fromPhone': ''
        }
    }
};


// determine which environment was passed as a command-line argument
const currentEnvironment = typeof(process.env.NODE_ENV) == 'string' ? process.env.NODE_ENV.toLowerCase() : '';


// check that the current environment is one of the environments above, if not, default to staging
var environmentToExport = typeof(environments[currentEnvironment]) == 'object' ? environments[currentEnvironment] : environments.staging;


// export the module
module.exports = environmentToExport;