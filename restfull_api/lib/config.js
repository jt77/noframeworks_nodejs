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
        'hashingSecret': 'thisIsASecretString'
    },

    // production environment
    production : {
        'httpPort': 5000,
        'httpsPort': 5001,
        'envName': 'production',
        'hashingSecret': 'thisIsASecretString'
    }
};


// determine which environment was passed as a command-line argument
const currentEnvironment = typeof(process.env.NODE_ENV) == 'string' ? process.env.NODE_ENV.toLowerCase() : '';


// check that the current environment is one of the environments above, if not, default to staging
var environmentToExport = typeof(environments[currentEnvironment]) == 'object' ? environments[currentEnvironment] : environments.staging;


// export the module
module.exports = environmentToExport;