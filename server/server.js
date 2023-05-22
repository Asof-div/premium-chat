const _ = require('lodash');
const fs = require( "fs");
const net = require('net');
const path = require("path");
const http = require( "http");
const https = require( "https");
const port = 8080;
const sslPort = 8443;
const netPort = 8444;
const firebase = require("firebase-admin");
const serviceAccount = require('../ServiceAccountKey.json');
const {Connection} = require('./utils/Connection');
const {Conversation} = require('./utils/Conversation');
const {ChatMessage} = require('./utils/ChatMessage');
const {EventMessage} = require('./utils/EventMessage');
const {QuoteMessage} = require('./utils/QuoteMessage');
const {FileMessage} = require('./utils/FileMessage');
const {Support} = require('./utils/Support');
const {Logger} = require('./utils/Logger');
const {Validation} = require('./utils/Validation');
const {Violation} = require('./utils/Violation');

const httpServer  = http.createServer();
const httpsServer = https.createServer({
    "key" : fs.readFileSync(path.resolve(__dirname, "../server/certs/star_domain_com.key")),
    "cert": fs.readFileSync(path.resolve(__dirname, "../server/certs/STAR_domain_com.crt")),
    "ca"  : fs.readFileSync(path.resolve(__dirname, "../server/certs/STAR_domain_com.ca-bundle"))
});


httpServer.listen( port, function() {
    // console.log(`Listening HTTP on ${port}`);
});
httpsServer.listen( sslPort, function() {
    // console.log(`Listening HTTPS on ${sslPort}`);
});

// Initialize Firebase
firebase.initializeApp({
    credential: firebase.credential.cert(serviceAccount)
});

// var io = require("socket.io")(httpsServer, {
//     wsEngine: 'eiows',
//     perMessageDeflate: {
//         threshold: 32768
//     }
// });
var io = require("socket.io")(httpsServer);
io.attach( httpServer  );
// io.attach( httpsServer );

const db = firebase.firestore();
const TERAWORK_ROOM = 'TERAWORK_ADMIN';
var errors =  [];
var loggerInstance = new Logger(db);
var connInstance = new Connection(db);
var convInstance = new Conversation(db, loggerInstance);
var chatInstance = new ChatMessage(db);
var eventInstance = new EventMessage(db);
var fileInstance = new FileMessage(db);
var quoteInstance = new QuoteMessage(db);
var supportInstance = new Support(db);
var vioInstance = new Violation(db, loggerInstance);
var valInstance = new Validation();
const adminMessageLimit = 5;
connInstance.setConnections();

// var io = socket.listen(port);


// socket.join('room')
// socket.leave('room')

//io.emit -> io.to('room').emit
//socket.broadcast.emit -> socket.broadcast.to('room').emit
//socket.emit

const server = net.createServer((socket) => {

    socket.on('data', async (msg) => {
        msgData = JSON.parse(msg.toString('utf8'));
        // io.sockets.emit('incoming-event', {event: msgData});

        if(msgData.action == 'resend-message'){
            let msg = await chatInstance.getMessage(msgData.msg_id);
            if(msg){
                io.to(msg.conversationId).emit('incoming', msg);
            }
        }

    });

}).listen(netPort);

io.use((socket, next) => {
    let username = socket.handshake.query.username;
    if (username && username !== 'null' && username !== null && username !== undefined ) {
        return next();
    }
    // socket.disconnect();
    return next(new Error('authentication error'));
});


function addError(e, call){
	errors =  [
            {
                'msg' : e,
            }, ... errors];
}

setInterval(function(){
    prevConnections = connInstance.connections;
    let users = connInstance.getOnlineUsers(io.sockets);
    nextConnections = connInstance.connections;
    if(!_.isEqual(prevConnections, nextConnections)){
        io.sockets.emit('connection', {'users': users});
    }

}, 50000)


setInterval(async function(){
    let conns = connInstance.connections;
    let lostconns = connInstance.lostConnections;
    lostconns.forEach( doc => {
        connInstance.deleteConnection(doc.connectionId);
    });

}, 20000)

io.on('connection', function (socket) {
    if(socket && socket.handshake){

        
    }

    try{

        let username = (socket.handshake && socket.handshake.query ) ? socket.handshake.query.username : ''; // 'TERAWORK-Abiodun'
        let userType = (socket.handshake && socket.handshake.query ) ? socket.handshake.query.userType : 'user';

        let user = connInstance.find(socket.id, username);

        if(socket.id  && username){
            connInstance.addConnection(socket.id, username);
        }

        if(!user && socket.connected && userType != 'admin'){
            let users = connInstance.getOnlineUsers(io.sockets);

            io.sockets.emit('online-users', {'users': users});
        }
        if(!user && socket.connected && userType && userType.toLowerCase() == 'admin'){
        
            socket.join(TERAWORK_ROOM);

        }

        socket.on('connect_timeout', (timeout) => {
            
            let username = socket.handshake.query.username;
            let connection = connInstance.remove(socket.id);

            socket.removeAllListeners()
        });
        
        socket.on('disconnecting', () => {
            socket.leaveAll();
        });

        socket.once("disconnect", function () {
            let connection = connInstance.remove(socket.id);
            let users = connInstance.getOnlineUsers(io.sockets);
            io.sockets.emit('online-users', {'users': users});
            socket.leaveAll();
            socket.removeAllListeners();
            delete socket;
            if(connection && connection.connectionId){
                delete io.sockets.sockets[connection.connectionId];
            }

        });

        socket.on('closeConversation', async function(data) {

            let username = socket.handshake.query.username;
            let conversation = await convInstance.updateConversation({conversationId: data.conversationId, status: 'Close'});
            
            conversation.members.forEach(async(name) => {
                let conv = await convInstance.getUserConversation(name, conversation.id);
                connInstance.emitToUser(io.sockets, name, 'conv-update', conv);
            });
            
        });

        socket.on('reopenConversation', async function(data) {

            let username = socket.handshake.query.username;
            let conversation = await convInstance.updateConversation({conversationId: data.conversationId, status: 'Open'});
            
            conversation.members.forEach(async(name) => {
                let conv = await convInstance.getUserConversation(name, conversation.id);
                connInstance.emitToUser(io.sockets, name, 'conv-update', {...conv, status: 'Open'});
            });
            
        });

        socket.on('getConversations', async function(data) {

            // console.log('username', socket.handshake.query)
            let username = socket.handshake.query.username;
            let convs = await convInstance.getUserConversations(username);
            convs.forEach(conv => {
                socket.join(conv.id)
                
            });

            let conns = connInstance.getOnlineUsers(io.sockets);
            socket.emit('conv-list', {convs, conns });
        });

        socket.on('getAllConversations', async function(data) {

            let username = socket.handshake.query.username;
            // let convs = await convInstance.getAllConversations();
            let convs = await convInstance.getAllConversationsInLast5Days();

            let conns = connInstance.getOnlineUsers(io.sockets);

            socket.emit('all-conv-list', {convs, conns });

        });

        socket.on('newConversation', async function(data, callback) {

            let username = socket.handshake.query.username;

            let conversation = await convInstance.createPeerConversation(data);
            
            connInstance.membersJoinRoom(io.sockets, conversation.members, conversation.id);

            conversation.members.forEach(async(name) => {
                let conv = await convInstance.getUserConversation(name, conversation.id);
                connInstance.emitToUser(io.sockets, name, 'conv-update', {...conv, oldPK: data.PK});
            });

            callback({conversation, oldPK: data.PK});

        });

        socket.on('createGroupConversation', async function(data) {

            let username = socket.handshake.query.username;
            let conversation = await convInstance.createGroupConversation(data);
            socket.emit('create-group',  conversation);

            let members = [...conversation.members, conversation.guest.userName];
            connInstance.membersJoinRoom(io.sockets, members, conversation.id);
            let conns = connInstance.getOnlineUsers(io.sockets);
            
            members.forEach(async(name) => {
                if(name){
                    let convs = await convInstance.getUserConversations(name);
                    connInstance.emitToUser(io.sockets, name, 'conv-list', {convs, conns });
                }
            });

        });

        socket.on('getAllSupports', async function(data) {

            let username = socket.handshake.query.username;
            let supports = await supportInstance.getAllSupports();
            
            socket.emit('support-list', {supports});

        });

        socket.on('requestSupport', async function(data) {

            let username = socket.handshake.query.username;
            const failed = valInstance.validateSupport(data);
            // console.log('validation',failed);

            if(failed){
                data.error = failed
                socket.emit('failed-msg', data);

            }else{
                    
                let support = await supportInstance.requestSupport(data);
                
                socket.emit('chat-support', {support});

                supportInstance.sendMail(support);
            }

        });

        socket.on('kickoutSupport', async function(data) {

            let username = socket.handshake.query.username;
            let user = await supportInstance.endSupport(data);
            
            let conversation = await convInstance.getConversation(data.conversationId);
            io.to(TERAWORK_ROOM).emit('leave-support', conversation);

            conversation.members.forEach(async(name) => {
                let conv = await convInstance.getUserConversation(name, conversation.id);
                connInstance.emitToUser(io.sockets, name, 'conv-update', conv);
            });

            if(user != ""){

                let eventPayload = {
                    message: `${user} from TERAWORK removed from this conversation`,
                    messageTitle: 'A User Is Removed',
                    userName: 'all',
                    conversationId: data.conversationId,
                    messageType: 'event',
                    timestamp: Date.now(),
                }
        
                eventPayload = await eventInstance.sendEvent(eventPayload);

                io.emit('incoming-event', {event: eventPayload});
            }

        });

        socket.on('adminLeaveSupport', async function(data) {

            let username = socket.handshake.query.username;
            let user = await supportInstance.endSupport(data);
            socket.leaveAll();

            let conversation = await convInstance.getConversation(data.conversationId);
            
            socket.emit('leave-support', conversation);

            conversation.members.forEach(async(name) => {
                let conv = await convInstance.getUserConversation(name, conversation.id);
                connInstance.emitToUser(io.sockets, name, 'conv-update', conv);
            });

            if(user != ""){

                let eventPayload = {
                    message: `${user} from TERAWORK removed from this conversation`,
                    messageTitle: 'A User Is Removed',
                    userName: 'all',
                    conversationId: data.conversationId,
                    messageType: 'event',
                    timestamp: Date.now(),
                }
        
                eventPayload = await eventInstance.sendEvent(eventPayload);

                io.emit('incoming-event', {event: eventPayload});
            }

        });

        socket.on('openTicket', async function(data) {

            let username = socket.handshake.query.username;
            
            if(data.senderName != undefined){

                let eventPayload = {
                    message: `Reporting ${data.senderName}. Support ticket opened.`,
                    messageTitle: 'User Reported. Ticket Opened',
                    userName: data.senderName,
                    userId: data.senderId,
                    userType: data.senderType,
                    conversationId: data.conversationId,
                    messageType: 'event',
                    timestamp: Date.now(),
                }
        
                eventPayload = await eventInstance.sendEvent(eventPayload);

                io.to(data.conversationId).emit('incoming', eventPayload);
            }

        });

        socket.on('adminIntervene', async function(data) {

            let username = socket.handshake.query.username;
            let conversation = await supportInstance.intervene(data);
            
            io.to(TERAWORK_ROOM).emit('remove-support', {...data, id: data.supportId});
            
            socket.emit('conversation-update', conversation);

            conversation.oldPK = data.PK;
            conversation.members.forEach(async(name) => {
                let conv = await convInstance.getUserConversation(name, conversation.id);
                conv.oldPK = data.PK;
                connInstance.emitToUser(io.sockets, name, 'conv-update', conv);
            });

            if(conversation.guest != undefined && conversation.guest.username != undefined){

                let eventPayload = {
                    message: `${conversation.guest.username} from TERAWORK now added to this conversation`,
                    messageTitle: 'New User Joined The Session',
                    userName: 'all',
                    conversationId: conversation.id,
                    messageType: 'event',
                    timestamp: Date.now(),
                }
        
                eventPayload = await eventInstance.sendEvent(eventPayload);

                io.emit('incoming-event', {event: eventPayload});
            }

        });

        socket.on('getMessageByAdmin', async function(data){
            
            let username = socket.handshake.query.username;
            let userType = socket.handshake.query.userType;
            let permission = socket.handshake.query.permission;
            let messages = [];
            if((permission == 'sa' || permission == 'SuperAdmin') && userType.toLowerCase () == 'admin'){
                messages = await convInstance.getMessages(data.conversationId);
            }else {
                messages = await convInstance.getMessagesWithLimits(data.conversationId, adminMessageLimit);
            }

            const payload = {
                conversationId: data.conversationId,
                messages
            }

            socket.emit('admin-msg-list', payload);


        })

        socket.on('sendMessage', async function(data) {

            let username = socket.handshake.query.username;
            const failed = valInstance.validateMessage(data);

            if(failed){
                data.error = failed
                socket.emit('failed-msg', data);

            }else{

                if(data.conversationId == '' || data.conversationId == null || data.conversationId.length < 4){

                    let conv = await convInstance.createPeerConversation(data);
                    data.conversationId = conv.id;
            
                    connInstance.membersJoinRoom(io.sockets, conv.members, conv.id);

                    conv.members.forEach(async(name) => {
                        let conv = await convInstance.getUserConversation(name, conv.id);
                        connInstance.emitToUser(io.sockets, name, 'conv-update', {...conv, oldPK: data.PK});
                    });
            
                }

                const payload = await chatInstance.sendMessage(data);
                socket.broadcast.to(payload.conversationId).emit('incoming', payload);
                if(payload.deliver == true){
                    socket.emit('sent', payload);

                }else{

                    let eventPayload = await vioInstance.sendMessage(payload);
                    socket.emit('incoming', eventPayload);
                }

                let conv = await convInstance.getConversation(payload.conversationId);
                io.to(TERAWORK_ROOM).emit('conversation-update', conv);

            }

        });

        socket.on('sendQuote', async function(data) {

            let username = socket.handshake.query.username;

            const failed = valInstance.validateQuote(data);
            
            if(failed){
                data.error = failed
                socket.emit('failed-msg', data);
            }else{
 
                if(data.conversationId == '' || data.conversationId == null || data.conversationId.length < 4){
            
                    let conv = await convInstance.createPeerConversation(data);
                    data.conversationId = conv.id;
            
                    connInstance.membersJoinRoom(io.sockets, conv.members, conv.id);

                    conv.members.forEach(async(name) => {
                        let conv = await convInstance.getUserConversation(name, conv.id);
                        connInstance.emitToUser(io.sockets, name, 'conv-update', {...conv, oldPK: data.PK});
                    });

                }
                const payload = await quoteInstance.sendQuote(data);
                socket.broadcast.to(payload.conversationId).emit('incoming', payload);
                if(payload.deliver == true){
                    socket.emit('sent', payload);
                }else{
                    let eventPayload = await vioInstance.sendQuote(payload);
                    socket.emit('incoming', eventPayload);
                }

                let conv = await convInstance.getConversation(payload.conversationId);
                io.to(TERAWORK_ROOM).emit('conversation-update', conv);

            }

        });

        socket.on('updateQuote', async function(data) {

            let username = socket.handshake.query.username;
            const failed = valInstance.validateUpdateQuote(data);
            
            if(failed){
                data.error = failed
                socket.emit('failed-msg', data);
            }else{

                const payload = await quoteInstance.updateQuote(data);
                socket.broadcast.to(payload.conversationId).emit('incoming', payload);
                if(payload.deliver == true){
                    socket.emit('sent', payload);
                }else{

                    let eventPayload = await vioInstance.sendQuote(payload);
                    socket.emit('incoming', eventPayload);
                }

                let conv = await convInstance.getConversation(payload.conversationId);
                io.to(TERAWORK_ROOM).emit('conversation-update', conv);
            }
        
        });

        socket.on('uploadFile', async function(data) {

            let username = socket.handshake.query.username;
            const failed = valInstance.validateUpload(data);
            
            if(failed){
                data.error = failed
                socket.emit('failed-msg', data);

            }else{

                if(data.conversationId == '' || data.conversationId == null || data.conversationId.length < 4){

                    let conv = await convInstance.createPeerConversation(data);
                    data.conversationId = conv.id;
            
                    connInstance.membersJoinRoom(io.sockets, conv.members, conv.id);

                    conv.members.forEach(async(name) => {
                        let conv = await convInstance.getUserConversation(name, conv.id);
                        connInstance.emitToUser(io.sockets, name, 'conv-update', {...conv, oldPK: data.PK});
                    });
            
                }
                const payload = await fileInstance.uploadFile(data);
                socket.broadcast.to(payload.conversationId).emit('incoming', payload);
                if(payload.deliver == true){
                    socket.emit('sent', payload);
                }else{
                    let eventPayload = await vioInstance.sendFile(payload);
                    socket.emit('incoming', eventPayload);
                }

                let conv = await convInstance.getConversation(payload.conversationId);
                io.to(TERAWORK_ROOM).emit('conversation-update', conv);
            }

        });

        socket.on('getMessages', async function(data) {

            let username = socket.handshake.query.username;
            let messages = await convInstance.getMessages(data.conversationId);
            const payload = {
                conversationId: data.conversationId,
                messages
            }

            socket.emit('msg-list', payload);

        });

        socket.on('addParticipant', async function(data, callback) {

            let username = socket.handshake.query.username;
            let conversation = await convInstance.addNewParticipant(data);
            if(conversation){

                socket.emit('conversation-update', conversation);

                conversation.members.forEach(async(name) => {
                    let conv = await convInstance.getUserConversation(name, conversation.id);
                    connInstance.emitToUser(io.sockets, name, 'conv-update', conv);
                });

                let conv = await convInstance.getConversation(conversation.id);
                io.to(TERAWORK_ROOM).emit('conversation-update', conv);
                
            }
            callback({conversation})

        });

        socket.on('getLogs', async function(data) {

            let username = socket.handshake.query.username;
            let logs = await loggerInstance.getAllLog();
            const payload = {
                logs
            }

            socket.emit('log-list', payload);

        });

        socket.on('deleteLog', async function(data, callback) {

            let username = socket.handshake.query.username;
            let log = loggerInstance.delete(data.id);
            callback({logId: data.id});
        });


    }catch(e){
        // addError(e, 'from web user');
        if(e.message != 'socket.on is not a function'){
            // console.log('erro', e.message, e.stack);
            loggerInstance.log('error', {errorMessage: e.message, errorStack: e.stack});
        }
    }


});




