const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    file: { type: String }, 
    originalFileName: { type: String }, 
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    targetSubTeam: { type: String, required: true },
    currentOwner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, 
    
    assignedMembers: [{
        member: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        instruction: { type: String },
        isCompleted: { type: Boolean, default: false },
        completedAt: { type: Date },
        
        // YENİ: Üyenin tamamladığında eklediği not ve dosya
        completionNote: { type: String },
        completionFile: { type: String },
        originalCompletionFileName: { type: String }
    }],

    // YENİ STATÜ EKLENDİ: 'KaptanOnayinda'
    status: { 
        type: String, 
        enum: ['Liderde', 'Uyelerde', 'LiderOnayinda', 'KaptanOnayinda', 'Tamamlandi'], 
        default: 'Liderde' 
    },

    deadline: { type: Date },
    reminderSent: { type: Boolean, default: false },
    completedAt: { type: Date },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Task', TaskSchema);