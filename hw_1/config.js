
const environments = {
    staging: {
        port: 3000,
        envName: 'staging'
    },
    production: {
        port: 5000,
        envName: 'production'
    }
}

const envString = typeof(process.env.NODE_ENV) === 'string' ? process.env.NODE_ENV.toLowerCase() : '';
const currentEnv = environments[envString] ? environments[envString] : environments.staging;

module.exports = currentEnv;