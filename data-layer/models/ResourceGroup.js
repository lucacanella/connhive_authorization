// data-layer/models/ResourceGroup.js
module.exports = {
    id: { 
        type: 'uuid',
        primary: true
    },
    name: {
        type: 'string',
        unique: 'true'
    },
    CONTAINS_RES: {
        type: "relationship",
        target: "Resource",
        relationship: "CONTAINS_RES",
        direction: "out",
        eager: false
    }
};