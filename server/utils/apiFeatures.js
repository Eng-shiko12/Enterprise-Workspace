
const applyApiFeatures = (query, queryString) => {
    const queryObj = { ...queryString };
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach(el => delete queryObj[el]);
    
    let modifiedQuery = query.find(queryObj);

    if (queryString.sort) {
        const sortBy = queryString.sort.split(',').join(' ');
        modifiedQuery = modifiedQuery.sort(sortBy);
    } else {
        modifiedQuery = modifiedQuery.sort('-createdAt'); 
    }


    const page = parseInt(queryString.page, 10) || 1;
    const limit = parseInt(queryString.limit, 10) || 10;
    const skip = (page - 1) * limit;

    modifiedQuery = modifiedQuery.skip(skip).limit(limit);

    return modifiedQuery;
};

module.exports = applyApiFeatures;