// Escape user input before it is used to build a RegExp (prevents ReDoS / regex injection)
module.exports = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
