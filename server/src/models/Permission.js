// models/Permission.js
const mongoose = require("mongoose");

const permissionSchema = new mongoose.Schema(
  {
    resource: { type: String, required: true, trim: true },
    action: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
  },
  { timestamps: true, _id: true }
);

permissionSchema.index({ resource: 1, action: 1 }, { unique: true });
module.exports = mongoose.model("Permission", permissionSchema);
