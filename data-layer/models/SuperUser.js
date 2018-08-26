// data-layer/models/SuperUser.js
module.exports = {
    id: { 
        type: 'uuid',
        primary: true
    },
    name: {
        type: 'string',
        unique: 'true'
    }
};