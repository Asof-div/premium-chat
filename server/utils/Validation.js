const firebaseAdmin = require('firebase-admin');
const Validate = require("validate.js");

class Validation {

    constructor () {
    }


    validateSupport(payload){
        let constraints = {
            requesterName: { presence : {allowEmpty: false} },
            requesterType: { presence : {allowEmpty: false} },
            title: { presence : {allowEmpty: false} },
            participants: { presence : {allowEmpty: false} },
            conversationId: { presence : true },
            conversationType: {presence: {allowEmpty: false}},
            };
            
        return Validate(payload, constraints);
        
    }
  
    validateMessage(payload){
        let constraints = {
            timestamp: { presence : {allowEmpty: false} },
            senderName: { presence : {allowEmpty: false} },
            senderType: { presence : {allowEmpty: false} },
            receiverName: { presence : {allowEmpty: false} },
            receiverType: { presence : {allowEmpty: false} },
            conversationId: { presence : true },
            messageType: {presence: {allowEmpty: false}},
            message: { presence : {allowEmpty: false} },
            };
            
        return Validate(payload, constraints);
        
    }

    validateQuote(payload){

        let constraints = {
            timestamp: { presence : {allowEmpty: false} },
            senderName: { presence : {allowEmpty: false} },
            senderType: { presence : {allowEmpty: false} },
            receiverName: { presence : {allowEmpty: false} },
            receiverType: { presence : {allowEmpty: false} },
            conversationId: { presence : true },
            currencyId: { presence : true },
            messageType: {presence: {allowEmpty: false}},
            items: { presence : {allowEmpty: false} },
        };
        
        return Validate(payload, constraints);
    }


    validateUpdateQuote(payload){

        let constraints = {
            timestamp: { presence : {allowEmpty: false} },
            senderName: { presence : {allowEmpty: false} },
            senderType: { presence : {allowEmpty: false} },
            receiverName: { presence : {allowEmpty: false} },
            receiverType: { presence : {allowEmpty: false} },
            conversationId: { presence : true },
            id: { presence : true },
            currencyId: { presence : true },
            messageType: {presence: {allowEmpty: false}},
            items: { presence : {allowEmpty: false} },
        };
        
        return Validate(payload, constraints);
    }


    validateGroup(payload){

        let constraints = {
            id: { presence : true },
            owner: { presence : true },
            items: { presence : {allowEmpty: false} },
        };
        
        return Validate(payload, constraints);
    }


    validateUpload(payload) {

        let constraints = {
            timestamp: { presence : {allowEmpty: false} },
            senderName: { presence : {allowEmpty: false} },
            senderType: { presence : {allowEmpty: false} },
            receiverName: { presence : {allowEmpty: false} },
            receiverType: { presence : {allowEmpty: false} },
            conversationId: { presence : true },
            messageType: {presence: {allowEmpty: false}},
            filename: { presence : {allowEmpty: false} },
            fileUrl: { presence : {allowEmpty: false} },
        };
        
        return Validate(payload, constraints);
    }

}

module.exports = {Validation};