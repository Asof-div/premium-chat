const axios = require('axios');
const firebaseAdmin = require('firebase-admin');
const {Conversation} = require('./Conversation');
const { Validation } = require('validate.js');
const moment = require('moment');

class Support {

    constructor (db, ) {
        this.db = db;
        this.convInstance = new Conversation(db);
        this.collection = 'supports';
        this.convCollection = 'conversations';
        this.userCollection = 'users';
    }

    async requestSupport(data){

        let support = {
            requesterName : data.requesterName,
            requesterType : data.requesterType,
            conversationId : data.conversationId,
            conversationType: data.conversationType,
            title: data.title,
            createdAt: moment().format('YYYY-MM-DD'),
            timestamp: Date.now(),
            participants: data.participants,
            agent: '',
            status: 'Open',
        }
        let sup = await this.db.collection(this.collection).add(support)
        support.id = sup.id;
        return support;

    }
    
    async getAllSupports(){
        
        let supports = [];
        
        const supRef = await this.db.collection(this.collection).get();
        if(supRef.empty){
            return [];
        }else{
            supRef.forEach(doc => {
                supports.push({id: doc.id,  ...doc.data()})
            });
        }
        return supports;
    
    }

    async intervene(data){
        let conv =  await this.convInstance.getConversation(data.conversationId);
        let guestTitle = `${data.title} - ${data.requesterName}`
        let guest = {username: data.userName, userType: data.userType};
        if(conv == undefined){
            return undefined;
        }

        let support = true;
        let supportEndAt = moment().add(30, 'days').format('YYYY-MM-DD');

        this.convInstance.updateConversation({conversationId: data.conversationId, guest, guestTitle: data.title, support, supportEndAt})

        // add admin to conversation 
        const adminRef = this.db.collection(`${this.userCollection}/${data.userName}/${this.convCollection}`).doc(data.conversationId );
        let adminConv = {
            id: conv.conversationId, 
            conversationId: conv.conversationId,
            userName: data.userName,
            userType: data.userType,
            title: guestTitle,
            members: conv.members,
            participants: conv.participants,
            guestTitle: data.title,
            guest: guest,
            type: conv.type,
            isAdmin: true,
            status: conv.status,
            timestamp: Date.now(),
            createdAt: Date.now(), 
            support: true,
            supportEndAt: moment().add(30, 'days').format('YYYY-MM-DD'),
            projects: conv.projects,
            projectTitles: conv.projectTitles || [],
        }

        await adminRef.set(adminConv)

        // delete support request
        await this.delete(data.supportId);

        return adminConv;
    }

    async endSupport(data){
        let conv =  await this.convInstance.getConversation(data.conversationId);

        console.log('endsupport function', conv);
        if(conv.guest !== undefined && data.data().guest !== null && conv.guest.userName !== undefined && conv.guest.userName == ""){
         
            await this.convInstance.updateConversation({conversationId: data.conversationId, guestRemove: true}, {guest: {}, guestTitle: "", support: false, supportEndAt: ""})
            
            this.convInstance.deleteUserConv({conversationId: data.conversationId, userName: conv.guest.userName});

            return conv.guest.userName;
        }

        return "";
    }

    delete(id){
        this.db.collection(this.collection).doc(id).delete();
    }

    sendMail(support){

        let message = '<table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">';
        message += `<tbody> <tr> <td> <p style="font-size: 14px; padding-bottom: 3px;"> ${support.requesterName} request for support on ${support.title} </b></p>`;
        message += '</td></tr> </tbody></table>';
        const payload = {
            message,
            subject: 'Chat Support: '+support.id 
        }
        axios.post(`url`, payload)
        .then(function (response) {
            // console.log('flaged succees');
            this.logger.log('success', {message: `Send mail : ${support.title}`});

        })
        .catch(function (error) {
            // console.log('flaged error');
            if(error.response.status == 422){
                this.logger.log('error-validation', {errorMessage: ` Request for chat support: ${payload.title} conversationId: ${payload.conversationId}  msg_type: ${payload.msg_type}`, errors: error.response.data.error.message});
            }else{
                this.logger.log('error', {errorMessage: error.response.data.error.message});
            }
        });
    
  
  
    }
}

module.exports = {Support};