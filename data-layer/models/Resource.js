// data-layer/models/Resource.js
module.exports = {
    id: { 
        type: 'uuid',
        primary: true
    },
    name: {
        type: 'string',
        unique: 'true'
    },
    type: 'string'
};