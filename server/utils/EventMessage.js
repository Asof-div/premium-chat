const firebaseAdmin = require('firebase-admin');
const {Conversation} = require('./Conversation');

class EventMessage {

    constructor (db) {
        this.db = db;
        this.conversation = new Conversation(db);
        this.convCollection = 'conversations';
        this.messageCollection = 'messages';
        this.userCollection = 'users';

    }

    async sendEvent(payload){
        payload.SK = "EVT";
        const item = {
            conversationId: payload.conversationId,
            SK: payload.SK,
            userName: payload.userName,
            messageType: payload.messageType,
            messageTitle: payload.messageTitle,
            message: payload.message,
            timestamp: payload.timestamp,
            referencePK: payload.referencePK || '',
            referenceType: payload.referenceType || '',
            referenceMessage: payload.referenceMessage || '',
            referenceTimestamp: payload.referenceTimestamp || ''
        }
        
        this.conversation.updateConversation(payload);
        
        const message = await this.db.collection(`${this.messageCollection}`).add(item);
        
        payload.id = message.id;
        payload.PK = message.id;
        return payload;

    }

    
    


}

module.exports = {EventMessage};