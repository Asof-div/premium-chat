const firebaseAdmin = require('firebase-admin');
const {Conversation} = require('./Conversation');

class FileMessage {

    constructor (db) {
        this.db = db;
        this.convInstance = new Conversation(db);
        this.convCollection = 'conversations';
        this.messageCollection = 'messages';
        this.userCollection = 'users';

    }

    async uploadFile(payload){

        if(payload.conversationId == '' || payload.conversationId == null || payload.conversationId.length < 4){
            let conv = await this.convInstance.createPeerConversation(payload)
            payload.conversationId = conv.id;
    
        }
        
        payload.SK = "FIL";
        payload.flagged = payload.flagged != undefined ? payload.flagged : !payload.passedViolation;
        payload.deliver = false;
        payload.sent = true;
        const item = {
            SK: payload.SK,
            conversationId: payload.conversationId,
            senderName: payload.senderName,
            senderType: payload.senderType,
            messageType: payload.messageType,
            fileUrl: payload.fileUrl,
            filename: payload.filename,
            timestamp: payload.timestamp,
            sent: payload.sent,
            flagged: payload.flagged,
            passedViolation: payload.passedViolation,
            createdAt: payload.timestamp,
            mimeType: payload.mimeType,
        }
        if(payload.workstoreId){
            item.workstoreId = payload.workstoreId;
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
            payload.deliver = true;
        }

        await this.convInstance.updateConversation(payload);
        const message = await this.db.collection(`${this.messageCollection}`).add(item);
        
        payload.id = message.id;
        payload.PK = message.id;
        return payload;
    }

    
    async getFiles(){
        const messageRef =  this.db.collection(`${this.messageCollection}`);
        const messageDoc = await messageRef.where('SK', '==', 'FIL').get();
        let messages = [];
        if(!messageDoc.empty){
            messageDoc.forEach(doc => {
                messages.push({id: doc.id, PK: doc.id, ...doc.data(), PK: doc.id})
            });
        }

        return messages;
    }

}

module.exports = {FileMessage};