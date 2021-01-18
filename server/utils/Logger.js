const axios = require('axios');
const firebaseAdmin = require('firebase-admin');
const { Validation } = require('validate.js');
const moment = require('moment');

class Logger {

    constructor (db, ) {
        this.db = db;
        this.collection = 'logs';
    }

    log(type, data){

        let log = {
            type: type,
            log: data,
            createdAt: moment().format('YYYY-MM-DD HH:mm:ss'),
            timestamp: Date.now(),
        }
        let sup = this.db.collection(this.collection).add(log)

    }
    
    async getAllLog(){
        
        let logs = [];
        
        const logRef = await this.db.collection(this.collection).get();
        if(logRef.empty){
            return [];
        }else{
            logRef.forEach(doc => {
                logs.push({id: doc.id,  ...doc.data()})
            });
        }
        return logs;
    
    }

    delete(id){
        this.db.collection(this.collection).doc(id).delete();
    }

}

module.exports = {Logger};