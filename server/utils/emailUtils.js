const nodemailer = require('nodemailer');

let transport;
const getTransport = () => {
    if (!process.env.EMAIL_HOST) throw new Error('EMAIL_HOST is not configured');
    if (!transport) {
        const port = Number(process.env.EMAIL_PORT) || 587;
        transport = nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port,
            secure: port === 465,
            auth: { user: process.env.EMAIL_USERNAME, pass: process.env.EMAIL_PASSWORD }
        });
    }
    return transport;
};

const escapeHtml = (s = '') =>
    String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const sendEmail = async ({ email, subject, text, html }) => {
    await getTransport().sendMail({
        from: process.env.EMAIL_FROM || 'Vortex <noreply@vortex.app>',
        to: email,
        subject,
        text,
        html
    });
};

module.exports = sendEmail;
module.exports.escapeHtml = escapeHtml;
