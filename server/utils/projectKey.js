const Project = require('../models/ProjectModel');

/**
 * Build a short, unique (per workspace) issue-key prefix such as "COR" from a project title.
 */
const baseFromTitle = (title = '') => {
    const words = title.toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
    let key = '';
    if (words.length >= 2) key = words.slice(0, 3).map((w) => w[0]).join('');
    else if (words.length === 1) key = words[0].slice(0, 3);
    key = key.replace(/^[0-9]+/, '');
    return key.length >= 2 ? key : 'PRJ';
};

const generateProjectKey = async (workSpaceId, title, preferred) => {
    const base = (preferred || baseFromTitle(title)).toUpperCase().slice(0, 5);
    let candidate = base;
    let n = 2;
    // eslint-disable-next-line no-await-in-loop
    while (await Project.exists({ workSpace: workSpaceId, key: candidate })) {
        candidate = `${base.slice(0, 4)}${n}`;
        n += 1;
        if (n > 99) break;
    }
    return candidate;
};

module.exports = { generateProjectKey, baseFromTitle };
