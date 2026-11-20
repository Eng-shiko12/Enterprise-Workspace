const mongoose = require('mongoose');
const crypto = require('crypto');
const slugify = require('slugify');

const workspaceSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true
    },
    description: { 
        type: String,
        default: ''
    },
    logo: {
        type: String,
        default: ''
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', 
        required: true,
        index: true
    },
    members: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        role: {
            type: String,
            enum: ['admin', 'owner', 'member'],
            default: 'member'
        },
        status: {
            type: String,
            enum: ['active', 'pending', 'invited'],
            default: 'pending'
        },
        joinedAt: {
            type: Date,
            default: Date.now
        }
    }],
    settings: {
        isPublic: {
            type: Boolean,
            default: false
        }
    }
}, { timestamps: true });

// Generate a unique, URL friendly slug before validation runs
workspaceSchema.pre('validate', function () {
    if (this.slug || !this.name) return;
    const base = slugify(this.name, { lower: true, strict: true }) || 'workspace';
    this.slug = `${base}-${crypto.randomBytes(3).toString('hex')}`;
});

const Workspace = mongoose.model('Workspace', workspaceSchema);
module.exports = Workspace;