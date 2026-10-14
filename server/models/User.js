const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"]
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        "Please provide a valid email address"
      ]
    },
    phone: {
      type: String,
      trim: true,
      default: ""
    },
    password: {
      type: String,
      required: function () {
        return this.authProvider === "local" || !this.authProvider;
      },
      minlength: [8, "Password must be at least 8 characters"]
    },
    role: {
      type: String,
      required: [true, "Role is required"],
      enum: {
        values: ["ADMIN", "MANAGER", "CASHIER", "STAFF"],
        message: "Role must be one of: ADMIN, MANAGER, CASHIER, STAFF"
      },
      default: "STAFF"
    },
    status: {
      type: String,
      required: [true, "Status is required"],
      enum: {
        values: ["ACTIVE", "INACTIVE"],
        message: "Status must be either ACTIVE or INACTIVE"
      },
      default: "ACTIVE"
    },
    googleId: {
      type: String,
      sparse: true
    },
    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local"
    },
    avatar: {
      type: String,
      default: ""
    },
    resetPasswordOtp: {
      type: String,
      default: undefined
    },
    resetPasswordOtpExpires: {
      type: Date,
      default: undefined
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.password;
        delete ret.resetPasswordOtp;
        delete ret.resetPasswordOtpExpires;
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Hash password before saving if modified
userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);

module.exports = User;
