const axios = require('axios');
const firebaseAdmin = require('firebase-admin');
const moment = require('moment');

class Conversation {

    constructor (db, logger) {
        this.db = db;
        this.logger = logger;
        this.userCollection = 'users';
        this.convCollection = 'conversations';
        this.messageCollection = 'messages';
        this.collection = 'conversations';
        this.companyPrefix = 'TERAWORK';
    }

    async createPeerConversation(item){
        let conver = {
            members: [item.senderName, item.receiverName],
            participants: [
                {name: item.senderName, 'type': item.senderType},
                {name: item.receiverName, 'type': item.receiverType}
            ],
            guestTitle: "",
            guest: {},
            support: false,
            supportEndAt: '',
            type: "P2P",
            status: "Open",
            timestamp: Date.now(),
            createdAt: Date.now(), 
            projects: 0,
            projectTitles: [],
        }
        if(item.workstoreId){
            conver.workstoreId = item.workstoreId; 
        }

        let user1 = {
            conversationId: item.conversationId,
            userName: item.senderName,
            userType: item.senderType,
            userId: item.senderId,
            title: item.receiverName,
            avatarId: item.receiverId,
            members: [item.senderName, item.receiverName],
            participants: [
                {name: item.senderName, 'type': item.senderType},
                {name: item.receiverName, 'type': item.receiverType}
            ],
            guestTitle: "",
            guest: {},
            support: false,
            supportEndAt: '',
            type: "P2P",
            status: "Open",
            timestamp: conver.timestamp,
            createdAt: conver.createdAt, 
            projects: 0,
            projectTitles: [],
        }

        let user2 = {
            conversationId: item.conversationId,
            userName: item.receiverName,
            userType: item.receiverType,
            userId: item.receiverId,
            title: item.senderName,
            avatarId: item.senderId,
            members: [item.senderName, item.receiverName],
            participants: [
                {name: item.senderName, 'type': item.senderType},
                {name: item.receiverName, 'type': item.receiverType}
            ],
            guestTitle: "",
            guest: {},
            support: false,
            supportEndAt: '',
            type: "P2P",
            status: "Open",
            timestamp: conver.timestamp,
            createdAt: conver.createdAt,
            projects: 0, 
            projectTitles: [],
        }

        let conv = {};
        if(item.persistConversationId == true){
            await this.db.collection(this.convCollection).doc(item.conversationId).set(conver);
            conv = {...conver, id: item.conversationId};
        }else{
            conv = await this.db.collection(this.convCollection).add(conver)
        }

        let conversation = {id: conv.id, conversationId: conv.id, PK: conv.id, ...conver}
        user1.id = conversation.id 
        user1.conversationId = conversation.id 
        user2.id = conversation.id 
        user2.conversationId = conversation.id 

        if(item.workstoreId){
            user1.workstoreId = item.workstoreId;
            user1.title = `job#${item.workstoreId}`;
            user2.workstoreId = item.workstoreId;
            user2.title = `job#${item.workstoreId} - ${item.senderName}`;
            conver.workstoreId = item.workstoreId; 
            item.conversationId = conversation.id; 
            if(item.persistConversationId == undefined || item.persistConversationId != true){
                this.replyWorkstore(item);
            }
        }

        const userRef1 = this.db.collection(`${this.userCollection}/${user1.userName}/${this.convCollection}`).doc(conversation.id );
        const userRef2 = this.db.collection(`${this.userCollection}/${user2.userName}/${this.convCollection}`).doc(conversation.id );
        userRef1.set(user1)
        userRef2.set(user2)

        return conversation;
    }

    async copy(){
        const userRef = this.db.collection(this.userCollection).doc('Xbiliti PR & Business Content');
    
        const convRef = await userRef.collection(this.convCollection).get();
        if(convRef.empty){
            return [];
        }else{
            convRef.forEach(doc => {
                const userRef1 = this.db.collection(`${this.userCollection}/Xbiliti PR and Business Content/${this.convCollection}`).doc(doc.id );
                userRef1.set(doc.data())
            });

        }

    }

    async createGroupConversation(item){
        let members = [];
        let participants = [];
        let guest = {};
        let guestTitle = item.title;
        let title = '';
        let owner = item.owner;
        let negotiator = item.owner;
        let coNegotiator = item.owner;

        item.participants.forEach((participant)=>{
            members.push(participant.name);
            participants.push({name: participant.name, type: participant.type});
            title += participant.name + '&'
        });

        if(item.negotiator){
            negotiator = item.negotiator;
        }

        if(item.coNegotiator){
            coNegotiator = item.coNegotiator;
        }

        let conver = {
            members,
            participants,
            guestTitle,
            guest,
            support: false,
            supportEndAt: '',
            type: "GRP",
            status: "Open",
            timestamp: Date.now(),
            createdAt: Date.now(), 
            projects: 0,
            projectTitles: [],
            owner,
            negotiator,
            coNegotiator
        }


        let conv = await this.db.collection(this.convCollection).add(conver)

        let conversation = {id: conv.id, ...conver}

        participants.forEach((participant)=>{
            let user = {
                conversationId: conversation.id,
                userName: participant.name,
                userType: participant.type,
                userId: parseInt(participant.id),
                title,
                avatarId: "",
                members,
                participants,
                guestTitle,
                guest,
                support: false,
                supportEndAt: '',
                type: "GRP",
                status: "Open",
                timestamp: conver.timestamp,
                createdAt: conver.createdAt, 
                projects: 0,
                projectTitles: [],
                owner,
                negotiator,
                coNegotiator
            }
            const userRef1 = this.db.collection(`${this.userCollection}/${user.userName}/${this.convCollection}`).doc(conversation.id );
            userRef1.set(user)

        });

        return conversation;
    }

    async getUserConversations(username){
        const userRef = this.db.collection(this.userCollection).doc(username);
        const userDoc = await userRef.get();
        let conversations = [];
        // console.log(username, userDoc.exists);
        if (!userDoc.exists) {

            let user = await this.db.collection(this.userCollection).doc(username).set({
                username,
            });
            return [];

        } else {
            const convRef = await userRef.collection(this.convCollection).get();
            if(convRef.empty){
                return [];
            }else{
                convRef.forEach(doc => {
                    conversations.push({id: doc.id, ...doc.data()})
                });

            }
            return conversations;
        }
    }

    async getUserConversation(username, conversationId){
        
        const conversations = await this.getUserConversations(username);
        return conversations.find((conv) => {return conv.id == conversationId});

    }

    async getAllConversations(){
        
        let conversations = [];
        
        const convRef = await this.db.collection(this.convCollection).orderBy('timestamp', 'desc').get();
        if(convRef.empty){
            return [];
        }else{
            convRef.forEach(doc => {
                conversations.push({id: doc.id, PK: doc.id, ...doc.data()})
            });
        }
        return conversations;
    
    }

    async getAllConversationsInLast5Days(){
        
        let date = new Date(Date.now() - 24 * 3600 * 1000 * 5);
        
        let conversations = [];
        
        const convRef = await this.db.collection(this.convCollection).where('timestamp', '>=', date.getTime()).orderBy('timestamp', 'desc').get();
        if(convRef.empty){
            return [];
        }else{
            convRef.forEach(doc => {
                conversations.push({id: doc.id, PK: doc.id, ...doc.data()})
            });
        }
        return conversations;
    
    }

    async getConversation(conversationId){
        const convRef = this.db.collection(this.collection).doc(conversationId);
        const convDoc = await convRef.get();
        if (convDoc.exists) {
            return {id: convDoc.id, conversationId: convDoc.id, PK: convDoc.id, ...convDoc.data()};
        } else {
            return {};
        }

    }

    async getMessages(conversationId){
        const messageRef =  this.db.collection(`${this.messageCollection}`);
        const messageDoc = await messageRef.where('conversationId', '==', conversationId).get();
        let messages = [];
        if(!messageDoc.empty){
            messageDoc.forEach(doc => {
                messages.push({id: doc.id, PK: doc.id, ...doc.data(), PK: doc.id})
            });
        }

        return messages;
    }

    async getMessagesWithLimits(conversationId, limit=5){
        const messageRef =  this.db.collection(`${this.messageCollection}`);
        const messageDoc = await messageRef.where('conversationId', '==', conversationId).orderBy('timestamp', 'desc').limit(limit).get();
        let messages = [];
        if(!messageDoc.empty){
            messageDoc.forEach(doc => {
                messages.push({id: doc.id, PK: doc.id, ...doc.data()})
            });
        }

        return messages;
    }

    async updateConversation(payload, updateCustomData={} ){

        const convRef = this.db.collection(this.collection).doc(payload.conversationId);
        const data = await convRef.get();
        let updateData = {
            timestamp: Date.now(),
        };
        if(payload.projects){
            updateData.projects = payload.projects;
        }
        if(payload.status){
            updateData.status = payload.status;
        }
        if(payload.guest !== undefined){
            updateData.guest = payload.guest;
        }
        if(payload.guestTitle !== undefined){
            updateData.guestTitle = payload.guestTitle;
        }
        if(payload.support !== undefined){
            updateData.support = payload.support;
        }
        if(payload.supportEndAt !== undefined){
            updateData.supportEndAt = payload.supportEndAt;
        }
        if(payload.guestRemove){
            updateData = {...updateData, guest: {}, guestTitle: "", support: false, supportEndAt: ""};
        }

        let convUpdateData = {...updateData, ...updateCustomData};
        updateData = {...updateData, ...updateCustomData};

        if(data.exists){
            data.data().members.forEach( async(doc) =>{
                let userRef = this.db.collection(`${this.userCollection}/${doc}/${this.convCollection}`).doc(payload.conversationId);
                let userDoc = await userRef.get();
                if(userDoc.exists){
                    userRef.update(updateData);
                }

            });

            delete convUpdateData.title;
            convRef.update(convUpdateData);

            if(data.data().guest !== undefined && data.data().guest !== null && data.data().guest.userName !== undefined && data.data().guest.userName == ""){
                let userRef = this.db.collection(`${this.userCollection}/${data.data().guest.userName}/${this.convCollection}`).doc(payload.conversationId);
                let userDoc = await userRef.get();
                if(userDoc.exists){
                    userRef.update(updateData);
                }
            }

            return {id: data.id, conversationId: data.id, PK: data.id, ...data.data()};
        }

    }

    async addNewParticipant(data){
        let conv = await this.getConversation(data.conversationId);
        if (conv.type == "GRP"){
            let participant = data.participant;
            conv.participants.filter(part => {
                part.type == participant.type && part.name == participant.name
            });

            let participants = conv.participants;
            let members = conv.members;
            let title = conv.title;

            members.push(participant.name);
            participants.push({name: participant.name, type: participant.type});
            title = members.join('&');

            // updating other participants datas
            await this.updateConversation({conversationId: data.conversationId, members}, {members, participants, title})

            //adding conversation for new participant
            let user = {
                conversationId: conv.id,
                userName: participant.name,
                userType: participant.type,
                userId: parseInt(participant.id),
                title,
                avatarId: "",
                members,
                participants,
                guestTitle: conv.guestTitle,
                guest: conv.guestTitle,
                support: false,
                supportEndAt: '',
                type: "GRP",
                status: conv.status,
                timestamp: Date.now(),
                createdAt: Date.now(), 
                projects: conv.projects,
                projectTitles: conv.projects,
                owner: conv.owner,
                negotiator: conv.negotiator,
                coNegotiator: conv.coNegotiator
            }

            const userRef1 = this.db.collection(`${this.userCollection}/${user.userName}/${this.convCollection}`).doc(conv.id );
            userRef1.set(user)

            conv = await this.getConversation(data.conversationId);
            return conv;
        }
        return undefined;
    }

    async deleteUserConv(payload){
        this.db.collection(`${this.userCollection}/${payload.userName}/${this.convCollection}`).doc(payload.conversationId).delete();
    }

    replyWorkstore(item){

        axios.post(`url`, {
                    name: item.senderName,
                    buyer_id: item.receiverId,
                    seller_id: item.senderId,
                    workstore_id: item.workstoreId,
                    conversation_id: item.conversationId,
                })
                .then(function (response) {

                    this.logger.log('success', {message: `Workstore Reply Post Validation Success workstoreId: ${item.workstoreId} seller: ${item.senderName}`});
                    // console.log(response);
                })
                .catch(function (error) {
                    if(error.response.status == 422){
                        this.logger.log('error-validation', {errorMessage: `Workstore Reply Post Validation ErrorworkstoreId: ${item.workstoreId} seller: ${item.senderName}`, errors: error.response.data.error.message});
                    }else{
                        this.logger.log('error', {errorMessage: error.response.data.error.message});
                    }
                    // console.log(error);
                });
    }

    
}

module.exports = {Conversation};