// data-layer/models/Capability.js
module.exports = {
    id: { 
        type: 'uuid',
        primary: true
    },
    name: {
        type: 'string',
        unique: 'true'
    },
    WHAT: {
        type: "relationship",
        target: "Resource",
        relationship: "WHAT",
        direction: "out",
        eager: true
    }
};