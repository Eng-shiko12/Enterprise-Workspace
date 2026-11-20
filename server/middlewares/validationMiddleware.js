const createError = require('../utils/AppError');

/**
 * Joi validation middleware.
 *   router.post('/', validate(schema), handler)
 * Unknown keys are rejected (this doubles as mass-assignment protection) and the
 * converted/trimmed value replaces req[source].
 */
const validate = (schema, source = 'body') => (req, res, next) => {
    const { error, value } = schema.validate(req[source] ?? {}, {
        abortEarly: false,
        convert: true,
        stripUnknown: false
    });

    if (error) {
        const message = error.details.map((d) => d.message.replace(/"/g, "'")).join('. ');
        return next(createError(message, 400));
    }

    if (source === 'body') req.body = value;
    next();
};

module.exports = validate;
