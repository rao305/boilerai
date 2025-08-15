const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    validate: {
      validator: function(email) {
        return email.endsWith('@purdue.edu');
      },
      message: 'Must use Purdue email address'
    }
  },
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 100
  },
  hashedPassword: {
    type: String,
    required: true,
    minlength: 6
  },
  // FERPA COMPLIANCE: Transcript data removed from persistent storage
  // Educational records are processed ephemerally and never stored
  // transcriptData: REMOVED - violates FERPA compliance
  // academicPlan: REMOVED - violates FERPA compliance
  
  // Non-educational metadata only
  profileCompleted: {
    type: Boolean,
    default: false
  },
  lastTranscriptProcessed: {
    type: Date,
    default: null
  },
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'system'
    },
    notifications: {
      type: Boolean,
      default: true
    }
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: {
    type: String,
    default: null
  },
  emailVerificationExpires: {
    type: Date,
    default: null
  },
  // SECURITY: Encrypted API key storage (non-educational data)
  encryptedApiKey: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  hasApiKey: {
    type: Boolean,
    default: false
  },
  apiKeyUpdatedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Index for performance
userSchema.index({ email: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ emailVerificationToken: 1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('hashedPassword')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.hashedPassword = await bcrypt.hash(this.hashedPassword, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.hashedPassword);
};

// Convert to JSON (excluding sensitive data)
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.hashedPassword;
  delete user.encryptedApiKey; // Never expose encrypted API key
  delete user.emailVerificationToken;
  delete user.emailVerificationExpires;
  return user;
};

module.exports = mongoose.model('User', userSchema);