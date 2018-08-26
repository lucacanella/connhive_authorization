// data-layer/models/Group.js
module.exports = {
    id: { 
        type: 'uuid',
        primary: true
    },
    name:  {
        type: 'string',
        unique: 'true'
    },
    CONTAINS_RES: {
        type: "relation",
        target: "User|SuperUser",
        relationship: "CONTAINS_USER",
        direction: "out",
        eager: false
    }
};