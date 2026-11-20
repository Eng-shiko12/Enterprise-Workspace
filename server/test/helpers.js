process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret-123';
process.env.FRONTEND_URL = 'http://localhost:5173';

const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const oid = () => new mongoose.Types.ObjectId();
const token = (id) => jwt.sign({ id: String(id) }, process.env.JWT_SECRET, { expiresIn: '1h' });

/** Make Model.findById(...).select(...) resolve to `value` (what authMiddleware does). */
const stubAuthUser = (User, user) => {
    User.findById = () => ({ select: async () => user, then: (res) => res(user) });
};

/** A fake workspace document as returned by WorkSpace.findOne in RBAC. */
const fakeWorkspace = ({ owner, members }) => ({
    _id: oid(),
    owner,
    members,
    name: 'Acme',
    save: async () => {},
    populate: async function () { return this; },
    toObject() { return { ...this }; }
});

module.exports = { oid, token, stubAuthUser, fakeWorkspace };
