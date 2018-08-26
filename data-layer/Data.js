const Neode = require('neode')
    , utils = require('../utils/core.js')
    ;

const 
    //general
      QUERY_PROFILING = parseInt(process.env.PROFILE_QUERIES)
    , _PROFILE_QUERIES = QUERY_PROFILING > 1 ? 'PROFILE ' : ''
    //models
    , MODEL_USER = "User"
    , MODEL_CAPABILITY = "Capability"
    , MODEL_RESOURCE = "Resource"
    , MODEL_RESOURCE_GROUP = "ResourceGroup"
    //relations
    , RELATION_CAN = 'CAN'
    , RELATION_ON = 'WHAT'
    , RELATION_DENY = 'DENY'
    , RELATION_CONTAINS_RES = 'CONTAINS_RES'
    //queries
    , QUERY_USER_DENIED_ACCESS_TO_RESOURCE = 
            `${_PROFILE_QUERIES}MATCH (u:User {name:$user})-[rels:DENY*1..]->(r:Resource {name:$resource})
            RETURN rels`
    , QUERY_DENY_USER_RESOURCE = 
            `${_PROFILE_QUERIES}MATCH (u:User {name:$user}) 
             MATCH (r:Resource {name:$resource})
             MERGE (u)-[d:DENY]->(r)`
    , QUERY_USER_CAN_RESOURCE = 
            `${_PROFILE_QUERIES}MATCH p=(u:User {name:$user})-->(:Capability {name:$capability})-[*0..]->(rg:ResourceGroup)-->(r:Resource {name:$resource})
            OPTIONAL MATCH (u)-[denyR:${RELATION_DENY}]->(r)
            OPTIONAL MATCH (u)-[denyG:${RELATION_DENY}]->(rg)-->(r)
            RETURN length(p) AS path_length, count(denyR) + count(denyG) AS deny`
    , QUERY_MERGE_RELATION_USER_CAPABILITY_RESOURCE = 
            `${_PROFILE_QUERIES}MATCH (u:${MODEL_USER} {name:$user})
             MATCH (r:${MODEL_RESOURCE} {name:$resource})
             MERGE (u)-[:${RELATION_CAN}]->(c:${MODEL_CAPABILITY} {name: $capability})-[:${RELATION_ON}]->(r)
             RETURN u, c, r`
    , QUERY_REVOKE_USER_CAPABILITY_RESOURCE = 
            `${_PROFILE_QUERIES}MATCH (u:${MODEL_USER} {name:$user})-[:${RELATION_CAN}]->(c:${MODEL_CAPABILITY} {name: $capability})-[:${RELATION_ON}]->(r:${MODEL_RESOURCE} {name:$resource})
             DETACH DELETE c`
    //errors
    , ERR_USER_ACCESS_DENIED = "USER_ACCESS_DENIED"
    , ERR_RESOURCE_GROUP_NOT_EXISTS = "RESOURCE_GROUP_DOESNT_EXIST"
    , ERR_RESOURCE_NOT_EXISTS = "RESOURCE_DOESNT_EXIST"
    , ERR_CANNOT_GRANT_CAPABILITY = "CANNOT_GRANT_CAPABILITY"
    ;

const instance = Neode.fromEnv().withDirectory(__dirname+'/models');

/**
 * Data Layer
 */
class Data {

    /**
     * Logs something.
     */
    log() {
        utils.log(utils.LOG.INFO, 'Data', ...arguments);
    }

    /**
     * Creates a new node in the graph.
     * @param {string} model the model (the node label)
     * @param {string} name the name property (which has a unique constraint)
     * @param {object} [otherProps={}] other node properties
     * @param {boolean} [insertNoMerge=false] tells the system to insert, instead of merge.
     */
    createNode(model, name, otherProps, insertNoMerge) {
        let props = otherProps ? { ...{ name: name }, ...otherProps } : { name: name };
        if(insertNoMerge) {
            this.log('Creating: ', model, props);
            return instance.create(model, props);
        } else {
            this.log('Merging: ', model, props);
            return instance.merge(model, props);
        }
    }

    /**
     * Create a new user.
     * @param {string} name name of the resource (must be unique)
     * @param {object|null} otherProps other properties of the resource
     * @param {boolean} [insertNoMerge=false] tells the system to insert, instead of merge.
     */
    createUser(name, otherProps, insertNoMerge) {
        return this.createNode(MODEL_USER, name, otherProps, insertNoMerge);
    }

    /**
     * Create a new resource.
     * @param {string} name name of the resource (must be unique)
     * @param {object|null} otherProps other properties of the resource
     * @param {boolean} [insertNoMerge=false] tells the system to insert, instead of merge.
     */
    createResource(name, otherProps, insertNoMerge) {
        return this.createNode(MODEL_RESOURCE, name, otherProps, insertNoMerge);
    }

    /**
     * Create a new resources group
     * @param {string} name identifies the resource group
     * @param {string} otherProps other group properties
     * @param {boolean} [insertNoMerge=false] tells the system to insert, instead of merge.
     */
    createResourceGroup(name, otherProps, insertNoMerge) {
        return this.createNode(MODEL_RESOURCE_GROUP, name, otherProps, insertNoMerge);
    }

    /**
     * Adds a DENY relationship between user and resource
     * @param {string} userName identifies user
     * @param {string} resource identifies resource
     */
    denyUserAccessToResource(userName, resource) {
        return instance.cypher(
            QUERY_DENY_USER_RESOURCE, 
            { 'user': userName, 'resource': resource }
        );
    }

    /**
     * Adds a resource to a resources group
     * @param {string} resource resource identifier
     * @param {string} group group identifier
     */
    addResourceToGroup(resource, group) {
        if(QUERY_PROFILING) {
            var pidx = utils.profileStart('Data:addResourceToGroup');
        }
        return Promise.all([
            instance.first(MODEL_RESOURCE_GROUP, { name: group }),
            instance.first(MODEL_RESOURCE, { name: resource })
        ]).then(([g, r])=>{
            if(!g) {
                let err = new Error(ERR_RESOURCE_GROUP_NOT_EXISTS);
                err.details = { name: group };
                throw err;
            } else if (!r) {
                let err = new Error(ERR_RESOURCE_NOT_EXISTS);
                err.details = { name: resource };
                throw err;
            }
            return g.relateTo(r, RELATION_CONTAINS_RES);
        }).finally(() => { 
            if(QUERY_PROFILING) {
                utils.profileEnd(pidx);
            }
        });
    }

    /**
     * Checks if user can do something on a resource.
     * @param {string} userName name of the user
     * @param {string} can capability name
     * @param {string} onResource resource name
     * @returns {Promise} returns a promise which resolves with true or false.
     */
    checkIfUserCan(userName, can, onResource) {
        if(QUERY_PROFILING) {
            var pidx = utils.profileStart('Data:checkIfUserCan');
        }
        return instance.cypher(
            QUERY_USER_CAN_RESOURCE,
            { 'user': userName, 'capability': can, 'resource': onResource }
        ).then(res => {
            if(res.summary.hasProfile()) {
                this.log(res.summary.profile);
            }
            // Query returns the path_length from the user to the resource, and a total count of the deny 
            // relationships between them. this results in:
            // 1. if user has a deny relationship between him and a resource: access denied!
            // 2. if user has no deny rels, but has at least a path to the resource that 
            //    goes through the requested capability: access granted!
            let resultObj = res.records.length && res.records[0].toObject()
              , granted = resultObj && resultObj.path_length > 0 && resultObj.deny < 1;
            return granted;
        }).finally(() => { 
            if(QUERY_PROFILING) {
                utils.profileEnd(pidx);
            }
        });;
    }

    /**
     * Grants a capability to a user on a certain resource.
     * @param {string} userName name of the user
     * @param {string} can capability name
     * @param {string} onResource resource name
     * @param {object|null} capabilityAttrs attributes of the capability
     */
    grantUserCapability(userName, can, onResource, capabilityAttrs) {
        if(QUERY_PROFILING) {
            var pidx = utils.profileStart('Data:grantUserCapability');
        }
        this.log('Granting capability: ', userName, can, onResource);
        return instance.cypher(
            QUERY_USER_DENIED_ACCESS_TO_RESOURCE,
            {'user': userName, 'resource': onResource}
        ).then(res => {
            if(res.records.length > 0) {
                //user access is denied.
                throw new Error(ERR_USER_ACCESS_DENIED);
            }
            //check if capability already exists for user
            return instance.cypher(QUERY_MERGE_RELATION_USER_CAPABILITY_RESOURCE, 
                {'user': userName, 'capability': can, 'resource': onResource}
            );
        }).then((res) => {
            if(res.summary.hasProfile()) {
                this.log(res.summary.profile);
            }
            if(res.records.length < 1) {
                //user access is denied.
                throw new Error(ERR_CANNOT_GRANT_CAPABILITY);
            }
        }).finally(() => {
            if(QUERY_PROFILING) {
                utils.profileEnd(pidx);
            }
        });
    }

    /**
     * Revokes capability for a user on a certain resource.
     * @param {string} userName name of the user
     * @param {string} can capability name
     * @param {string} onResource resource name
     */
    revokeCapability(userName, can, onResource) {
        if(QUERY_PROFILING) {
            var pidx = utils.profileStart('Data:revokeCapability');
        }
        this.log('Revoking capability: ', userName, can, onResource);
        return instance.cypher(
            QUERY_REVOKE_USER_CAPABILITY_RESOURCE,
            {'user': userName, 'capability': can, 'resource': onResource}
        ).then((res) => {
            if(res.summary.hasProfile()) {
                this.log(res.summary.profile);
            }
            if(res.summary.counters.nodesDeleted() > 0) {
                return true;
            } else {
                return false;
            }
        }).finally(() => {
            if(QUERY_PROFILING) {
                utils.profileEnd(pidx);
            }
        });
    }

    /**
     * Grants a capability to a user on a certain resource group.
     * @param {string} userName name of the user
     * @param {string} can capability name
     * @param {string} resourceGroup resource group identifier
     * @param {object|null} capabilityAttrs attributes of the capability
     */
    grantGroupCapability(userName, can, resourceGroup, capabilityAttrs) {
        this.log('Adding capability for resource group: ', userName, can, resourceGroup);
        return Promise.all([
            instance.first(MODEL_USER, { name: userName }),
            instance.merge(MODEL_CAPABILITY, { name: can }),
            instance.first(MODEL_RESOURCE_GROUP, { name: resourceGroup })
        ])
        .then(([user, cap, resourceGroup]) => {
            return Promise.all([
                user.relateTo(cap, RELATION_CAN, capabilityAttrs || {}, false),
                cap.relateTo(resourceGroup, RELATION_ON, {}, false)
            ]);
        });
    }

    /**
     * Closes connection.
     */
    close() {
        instance.close();
    }

}

module.exports = Data;