'use strict'

const { uuidv4 } = require('uuidv4')
const { AsyncLocalStorage } = require('async_hooks')

const als = new AsyncLocalStorage()

/**
 * Generates a function to generate tracer middleware for Express.
 */
const asyncLocalStorageMiddleware = () => {
    /**
     * Generates a request tracer middleware for Express.
     *
     * @param {Object} options possible options
     * @param {boolean} options.useHeaders respect request header flag
     *                                    (default: `false`)
     * @param {Record<string, string>} options.headerKeyValuePairs Record where key is name of header to be stored in store, value is the header to be extracted and stored against that key in store, used if `useHeader`/is set to `true`
     *                                    (default: `X-Request-Id`)
     * @param {function} options.requestIdFactory function used to generate request ids
     *                                    (default: UUIDs v4)
     */
    return ({
        useHeaders = false,
        headerNames = { 'requestId': 'X-Request-Id', 'sessionId': 'X-Session-Id' },
        requestIdFactory = uuidv4,
    } = {}) => {
        return (req, res, next) => {
            let store = {};
            if (useHeaders) {
                Object.keys(headerNames).forEach(key => {
                    const headerName = headerNames[key];
                    const id = req.headers[headerName.toLowerCase()] || requestIdFactory(req);
                    store[key] = id;
                });
            }
            als.run(store, () => {
                next()
            })
        }
    }
}

/**
 * Runs the given function in scope of the store.
 *
 * @param {Function} fn function to run
 * @param {JSONObject} store optional store to be available in the function
 */
const runWithStore = (fn, store) => {
    if (Object.keys(store).length === 0) {
        store['sessionId'] = uuidv4();
        store['requestId'] = uuidv4();
    }
    return als.run(store, fn);
}

/**
 * Runs the given function in scope of the store.
 *
 * @param {Function} fn function to run
 * @param {string} key key to be added in store to be available in the function
 * @param {string} value value to be added in store against the key to be available in the function
 */
const updateAndRunStore = (fn, key, value) => {
    let store = als.getStore() ? als.getStore() : { };
    store[key] = value;
    return als.run(store, fn);
}

/**
 * Returns the store in the context of the request or `undefined` in case if the call
 * is made outside of the CLS context.
 */
const store = () => als.getStore()

module.exports = {
    asyncLocalStorageMiddleware,
    runWithStore,
    updateAndRunStore,
    store,
}
