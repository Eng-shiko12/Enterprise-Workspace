// Strips Mongo operators ($where, $gt, ...) and dotted keys from user supplied bodies.
const clean = (value) => {
    if (Array.isArray(value)) return value.map(clean);
    if (value && typeof value === 'object') {
        return Object.keys(value).reduce((acc, key) => {
            if (key.startsWith('$') || key.includes('.')) return acc;
            acc[key] = clean(value[key]);
            return acc;
        }, {});
    }
    return value;
};

module.exports = (req, res, next) => {
    if (req.body && typeof req.body === 'object') req.body = clean(req.body);
    next();
};
