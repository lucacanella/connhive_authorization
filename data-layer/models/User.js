// data-layer/models/User.js
module.exports = {
    id: { 
        type: 'uuid',
        primary: true
    },
    name: {
        type: 'string',
        unique: 'true'
    },
    CAN: {
        type: "relationship",
        target: "Capability",
        relationship: "CAN",
        direction: "out",
        eager: false
    }
};