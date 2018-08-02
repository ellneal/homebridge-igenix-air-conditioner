module.exports.callbackify = (promise, callback) => {
    promise
        .then(result => callback(null, result))
        .catch(error => callback(error));
};
