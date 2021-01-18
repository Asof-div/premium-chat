const axios = require('axios');
const {EventMessage} = require('./EventMessage');

class Violation {

    constructor (db, logger) {
        this.db = db;
        this.eventInstance = new EventMessage(db);
        this.logger = logger;

    }

    async sendMessage(payload){

        let eventPayload = {
            message: 'You may have violated our policy that prohibit you from sharing contact details at this stage. We will provide update after further review.',
            messageTitle: 'Message Under Review',
            userName: payload.senderName,
            conversationId: payload.conversationId,
            messageType: 'event',
            timestamp: Date.now(),
            referencePK: payload.id,
            referenceTimestamp: payload.timestamp,
            referenceType: payload.messageType,
            referenceMessage: payload.message,
        }

        eventPayload = await this.eventInstance.sendEvent(eventPayload);
        
        const reportPayload = {
            sent_time: payload.timestamp,
            event_pk: eventPayload.id,
            msg_pk: payload.id,
            msg_sk: payload.SK,
            msg_type: payload.messageType,
            conv_id: payload.conversationId,
            user_id: payload.senderId,
            user_type: payload.senderType,
            username: payload.senderName,
            message: payload.message
        }

        this.report(reportPayload);

        return eventPayload;
    }


    async sendQuote(payload){

        const allQuoteDescription = payload.items.map((quote) => {
            return quote.description;
          }).join(' ** ');

        let eventPayload = {
            message: 'You may have violated our policy that prohibit you from sharing contact details at this stage. We will provide update after further review.',
            messageTitle: 'Message Under Review',
            userName: payload.senderName,
            conversationId: payload.conversationId,
            messageType: 'event',
            timestamp: Date.now(),
            referencePK: payload.id,
            referenceTimestamp: payload.timestamp,
            referenceType: payload.messageType,
            referenceMessage: allQuoteDescription,
        }

        eventPayload = await this.eventInstance.sendEvent(eventPayload);
        
        const reportPayload = {
            sent_time: payload.timestamp,
            event_pk: eventPayload.id,
            msg_pk: payload.id,
            msg_sk: payload.SK,
            msg_type: payload.messageType,
            conv_id: payload.conversationId,
            user_id: payload.senderId,
            user_type: payload.senderType,
            username: payload.senderName,
            message: allQuoteDescription
        }
        

        this.report(reportPayload);

        return eventPayload;
    }



    async sendFile(payload){

        let eventPayload = {
            message: 'You may have violated our policy that prohibit you from sharing contact details at this stage. We will provide update after further review.',
            messageTitle: 'Message Under Review',
            userName: payload.senderName,
            conversationId: payload.conversationId,
            messageType: 'event',
            timestamp: Date.now(),
            referencePK: payload.id,
            referenceTimestamp: payload.timestamp,
            referenceType: payload.messageType,
            referenceMessage: payload.message,
        }

        eventPayload = await this.eventInstance.sendEvent(eventPayload);
        
        const reportPayload = {
            sent_time: payload.timestamp,
            event_pk: eventPayload.id,
            msg_pk: payload.id,
            msg_sk: payload.SK,
            msg_type: payload.messageType,
            conv_id: payload.conversationId,
            user_id: payload.senderId,
            user_type: payload.senderType,
            username: payload.senderName,
            message: payload.fileUrl,
            filename: payload.filename,
            file_url: payload.fileUrl,
        }
        

        this.report(reportPayload);

        return eventPayload;
    }

    report(payload){

        axios.post(`url`, payload)
        .then(function (response) {
            // console.log('flaged succees');
            this.logger.log('success', {message: `Workstore Reply Post Validation Success EventId: ${payload.event_pk} msg_pk: ${payload.msg_pk}  msg_type: ${payload.msg_type}`});

        })
        .catch(function (error) {
            // console.log('flaged error');
            if(error.response.status == 422){
                this.logger.log('error-validation', {errorMessage: `Message Violation - Post Validation Error EventId: ${payload.event_pk} msg_pk: ${payload.msg_pk}  msg_type: ${payload.msg_type}`, errors: error.response.data.error.message});
            }else{
                this.logger.log('error', {errorMessage: error.response.data.error.message});
            }
        });
    
  
  
    }
  
    

}

module.exports = {Violation};