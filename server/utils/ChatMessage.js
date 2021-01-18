const firebaseAdmin = require('firebase-admin');
const {Conversation} = require('./Conversation');

class ChatMessage {

    constructor (db) {
        this.db = db;
        this.convInstance = new Conversation(db);
        this.convCollection = 'conversations';
        this.messageCollection = 'messages';
        this.userCollection = 'users';

    }

    async sendMessage(payload){

        if(payload.conversationId == '' || payload.conversationId == null || payload.conversationId.length < 4){
            let conv = await this.convInstance.createPeerConversation(payload)
            payload.conversationId = conv.id;
    
        }
        
        payload.SK = "MSG";
        payload.flagged = payload.flagged != undefined ? payload.flagged : !payload.passedViolation;
        payload.deliver = false;
        payload.sent = true;
        const item = {
            conversationId: payload.conversationId,
            SK: payload.SK,
            senderName: payload.senderName,
            senderType: payload.senderType,
            messageType: payload.messageType,
            message: payload.message,
            timestamp: payload.timestamp,
            sent: payload.sent,
            flagged: payload.flagged,
            passedViolation: payload.passedViolation,
            createdAt:payload.timestamp,
        }
        if(payload.replyText && payload.replyText.length > 1){
            item.replyText = payload.replyText;
        }
        if(payload.replyOwner && payload.replyOwner.length > 1){
            item.replyOwner = payload.replyOwner;
        }
        if(!payload.flagged ){
            payload.deliveryTime = Date.now();
            item.deliveryTime = payload.deliveryTime;
            item.deliver = true;
            payload.deliver = true;
        }
        if(payload.workstoreId){
            item.workstoreId = payload.workstoreId;
        }

        await this.convInstance.updateConversation(payload);
        const message = await this.db.collection(`${this.messageCollection}`).add(item);
        
        payload.id = message.id;
        payload.PK = message.id;
        return payload;
    }

    async getMessages(){
        const messageRef =  this.db.collection(`${this.messageCollection}`);
        const messageDoc = await messageRef.where('SK', '==', 'MSG').get();
        let messages = [];
        if(!messageDoc.empty){
            messageDoc.forEach(doc => {
                messages.push({id: doc.id, PK: doc.id, ...doc.data()})
            });
        }

        return messages;
    }

    async getMessage(id){
        const msgRef = this.db.collection(`${this.messageCollection}`).doc(id);
        let msgDoc = await msgRef.get();
        if(msgDoc.exists){
            return {id: msgDoc.id, PK: msgDoc.id, ...msgDoc.data()}
        }
        return '';
    }

    delete(id){
        this.db.collection(this.messageCollection).doc(id).delete();
    }


}

module.exports = {ChatMessage};