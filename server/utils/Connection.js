const firebaseAdmin = require('firebase-admin');

class Connection {

    constructor (db) {
        this.db = db;
        this.connCollection = 'connections';
        this.userCollection = 'users';
        this.connections = [];
        this.lostConnections = [];

    }

    async setConnections(){
        const connections = await this.db.collection(`${this.connCollection}`).get();
        connections.forEach(doc => {
            this.connections.push({id: doc.id, ...doc.data()})
        });

    }

    async addConnection(connectionId, username) {
        //add new connection
        const userRef = this.db.collection(this.connCollection).doc(connectionId);
        const userDoc = await userRef.get();
        if (!userDoc.exists) {
            let user = await this.db.collection(this.connCollection).doc(connectionId).set({
                username,
                connectionId
            });
            this.connections = [ ...this.connections, {connectionId, username}];

            return [];
        }
        
    }

    getConnection(connectionId) {
        //find user by connectionId 
        return this.connections.find((connection) => connection.connectionId == connectionId);
    }

    addLostConnection(connectionId, username) {
        this.lostConnections = [ ...this.lostConnections, {connectionId, username}];
        
    }

    find(connectionId, username) {
        //find user by connectionId 
        return this.connections.find((connection) => connection.connectionId == connectionId && connection.username == username);
    }

    getUserConnections(username) {
        //find user's connections 
        return this.connections.filter((connection) => connection.username == username);
    }

    getLostConnections(){
        const key = 'username';
        let objs =  this.lostConnections.reduce(function(rv, x) {
            (rv[x[key]] = rv[x[key]] || []).push(x);
            return rv;
          }, {});

        let users = [];
        for (let con in objs) {
            if (objs.hasOwnProperty(con)) {
              users.push({'username': con , 'connections': objs[con]} );
            }
        }

        return users;
    }

    remove (connectionId) {
        //remove from connections
        let connection = this.getConnection(connectionId);
        
        if(connection){
            this.addLostConnection(connection.connectionId, connection.username);
            this.connections = this.connections.filter( (connection) => connection.connectionId !== connectionId);
        }

        return connection;
    }

    deleteConnection(connectionId){
        
        const userRef = this.db.collection(this.connCollection).doc(connectionId);
        userRef.delete();
    
        this.lostConnections = this.lostConnections.filter( (connection) => connection.connectionId !== connectionId);

    }
    
    membersJoinRoom(server, members, room){

        members.forEach(name => {
            let conns = this.getUserConnections(name);
            conns.forEach(conn => {
                if( server.connected[conn.connectionId] && server.connected[conn.connectionId].connected ){
                    let socket = server.sockets[conn.connectionId];
                    socket.join(room);
                }
            });
        });
    }

    emitToUser(server, name, action, data){
        
        let conns = this.getUserConnections(name);
        conns.forEach(conn => {
            if( server.connected[conn.connectionId] && server.connected[conn.connectionId].connected ){
                let socket = server.sockets[conn.connectionId];
                socket.emit(action, data);
            }
        });
    }

    getOnlineUsers (server){

        this.connections = this.connections.filter(connection => {
            if(!(server.connected[connection.connectionId] && server.connected[connection.connectionId].connected) ){
                if(server.sockets[connection.connectionId]){
                    server.sockets[connection.connectionId].leaveAll();
                }
                delete server.sockets[connection.connectionId];
                this.addLostConnection(connection.connectionId, connection.username);
                return false;
            }
            return true;
        });

        return [...new Set(this.connections.map((a) => a.username))];
    }



}

module.exports = {Connection};