const firebaseAdmin = require('firebase-admin');
const {Conversation} = require('./Conversation');
const moment = require('moment');

class QuoteMessage {

    constructor (db) {
        this.db = db;
        this.convInstance = new Conversation(db);
        this.convCollection = 'conversations';
        this.messageCollection = 'messages';
        this.userCollection = 'users';

    }

    async sendQuote(payload){

        if(payload.conversationId == '' || payload.conversationId == null || payload.conversationId.length < 4){
            let conv = await this.convInstance.createPeerConversation(payload)
            payload.conversationId = conv.id;
    
        }
        
        payload.SK = "QUO";
        payload.flagged = payload.flagged != undefined ? payload.flagged : !payload.passedViolation;
        payload.sellerURLName = payload.sellerURLName ==  undefined ? "-" : payload.sellerURLName; 
        payload.deliver = false;
        payload.sent = true;
        const item = {
            SK: payload.SK,
            conversationId: payload.conversationId,
            profileId: parseInt(payload.profileId),
            senderName: payload.senderName,
            senderType: payload.senderType,
            currencyId: payload.currencyId,
            messageType: payload.messageType,
            items: payload.items,
            timestamp: payload.timestamp,
            sent: payload.sent,
            flagged: payload.flagged,
            revision: 0,
            passedViolation: payload.passedViolation,
            deliver:  payload.deliver,
            createdAt:payload.timestamp,
            updatedAt:payload.timestamp,
            expiryDate: payload.expiryDate,
            expirationDate: moment(payload.expiryDate).format('YYYY-MM-DD'),
            sellerURLName: payload.sellerURLName,
            expiryDate: payload.expiryDate,

        }

        if(!payload.flagged ){
            payload.deliveryTime = Date.now();
            item.deliveryTime = payload.deliveryTime;
            item.deliver = true;
            payload.deliver = true;
        }
        if(payload.workstoreId){
            item.workstoreId = parseInt(payload.workstoreId);
        }
        
        await this.convInstance.updateConversation(payload);
        const message = await this.db.collection(`${this.messageCollection}`).add(item);
        
        payload.id = message.id;
        payload.PK = message.id;
        return payload;
    }


    async updateQuote(payload){
        
        payload.flagged = payload.flagged != undefined ? payload.flagged : !payload.passedViolation;
        payload.deliver = false;
        payload.sent = true;
        payload.edited = true;
        payload.sellerURLName = payload.sellerURLName ==  undefined ? "-" : payload.sellerURLName; 
        payload.deliveryTime = 0;
        if(!payload.flagged ){
          payload.deliveryTime = Date.now();
          payload.deliver = true;
        }
        payload.updatedAt = payload.updatedAt ? payload.updatedAt : Date.now();

        
        const item = {
            profileId: parseInt(payload.profileId),
            currencyId: payload.currencyId,
            items: payload.items,
            timestamp: payload.timestamp,
            sent: payload.sent,
            flagged: payload.flagged,
            revision: payload.revision,
            passedViolation: payload.passedViolation,
            deliver:  payload.deliver,
            createdAt:payload.timestamp,
            updatedAt:payload.timestamp,
            expiryDate: payload.expiryDate,
            expirationDate: moment(payload.expiryDate).format('YYYY-MM-DD'),
            sellerURLName: payload.sellerURLName,
            expiryDate: payload.expiryDate,
        }

        
        await this.convInstance.updateConversation(payload);
        const msgRef = this.db.collection(`${this.messageCollection}`).doc(payload.id);
        let msgDoc = await msgRef.get();
        if(msgDoc.exists){
            msgRef.update(item);
        }

        payload.PK = payload.id;
        return payload;
    }

    
    async getAllQuotesExpiringOn(date){
        const messageRef =  this.db.collection(`${this.messageCollection}`);
        const messageDoc = await messageRef.where('expirationDate', '==', date).where('SK', '==', 'QUO').get();
        let messages = [];
        if(!messageDoc.empty){
            messageDoc.forEach(doc => {
                messages.push({id: doc.id, PK: doc.id, ...doc.data()})
            });
        }

        return messages;
    }



}

module.exports = {QuoteMessage};