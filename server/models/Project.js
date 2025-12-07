// server/models/Project.js (GÜNCEL)
const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String },
    leader: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Ana Kaptan
    
    joinCode: { type: String, required: true, unique: true },
    
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    
    // Alt Ekipler (Güncellendi: Artık her ekibin bir lideri var)
    subTeams: [{
        name: { type: String }, 
        leader: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // YENİ: Alt Ekip Lideri
        members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
    }],

    // Duyurular (YENİ)
    announcements: [{
        title: { type: String, required: true },
        content: { type: String, required: true },
        author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Kim yazdı?
        authorName: { type: String }, // Frontend'de kolaylık olsun diye ismini de tutalım
        createdAt: { type: Date, default: Date.now }
    }],
    
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Project', ProjectSchema);