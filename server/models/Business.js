const mongoose = require("mongoose");

const businessSchema = new mongoose.Schema(
  {
    businessName: {
      type: String,
      required: [true, "Business name is required"],
      trim: true,
      default: "Apex Billing Solutions"
    },
    address: {
      type: String,
      required: [true, "Address is required"],
      trim: true,
      default: "123 Business Avenue, Suite 100, Tech Park, City - 560001"
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
      default: "+91 9876543210"
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
      match: [
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        "Please provide a valid email address"
      ],
      default: "contact@apexbilling.com"
    },
    gstNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: "29AAAAA0000A1Z5"
    },
    logo: {
      type: String,
      default: ""
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Helper static method to get single active profile
businessSchema.statics.getOrCreateProfile = async function () {
  let profile = await this.findOne();
  if (!profile) {
    profile = await this.create({
      businessName: "Apex Billing Solutions",
      address: "123 Commercial Street, Suite 400, Financial District",
      phone: "+91 9876543210",
      email: "contact@apexbilling.com",
      gstNumber: "29AAAAA0000A1Z5",
      logo: ""
    });
  }
  return profile;
};

const Business = mongoose.model("Business", businessSchema);

module.exports = Business;
