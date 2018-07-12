module.exports.executePromise = (promise, callback) => {
    promise
        .then(result => callback(null, result))
        .catch(error => callback(error));
};
