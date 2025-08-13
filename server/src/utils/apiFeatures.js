// utils/apiFeatures.js
const mongoose = require("mongoose");

class APIFeatures {
  constructor(query, queryString) {
    this.query = query; // Mongoose Query object
    this.queryString = queryString; // req.query object
  }

  filter() {
    const queryObj = { ...this.queryString };
    const excludedFields = ["page", "sort", "limit", "fields"];
    excludedFields.forEach((el) => delete queryObj[el]);

    // Advanced filtering (gte, gt, lte, lt)
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);

    const parsedQuery = JSON.parse(queryStr);

    // Convert potential string IDs to ObjectIDs for filtering
    const idFields = [
      "user_id",
      "channel_id",
      "plan_id",
      "link_id",
      "role_id",
      "subscription_id",
      "created_by",
      "belongs_to", // Added belongs_to
    ];
    // --- END MODIFIED ---
    Object.keys(parsedQuery).forEach((key) => {
      if (
        idFields.includes(key) &&
        typeof parsedQuery[key] === "string" &&
        mongoose.Types.ObjectId.isValid(parsedQuery[key])
      ) {
        parsedQuery[key] = new mongoose.Types.ObjectId(parsedQuery[key]);
      }
      // Handle $in operator with potential string IDs
      if (
        typeof parsedQuery[key] === "object" &&
        parsedQuery[key] !== null &&
        parsedQuery[key].$in &&
        Array.isArray(parsedQuery[key].$in)
      ) {
        if (idFields.includes(key)) {
          parsedQuery[key].$in = parsedQuery[key].$in.map((id) =>
            typeof id === "string" && mongoose.Types.ObjectId.isValid(id)
              ? new mongoose.Types.ObjectId(id)
              : id
          );
        }
      }
      // Add case-insensitive regex search for specific string fields if needed
      // const stringSearchFields = ['name', 'description', 'phone', 'email'];
      // if (stringSearchFields.includes(key) && typeof parsedQuery[key] === 'string') {
      //     parsedQuery[key] = { $regex: parsedQuery[key], $options: 'i' };
      // }
    });

    this.query = this.query.find(parsedQuery);
    return this;
  }

  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(",").join(" ");
      this.query = this.query.sort(sortBy);
    } else {
      // Default sort by creation date descending if available, otherwise maybe by _id
      if (this.query.model.schema.paths.createdAt) {
        this.query = this.query.sort("-createdAt");
      } else {
        this.query = this.query.sort("-_id");
      }
    }
    return this;
  }

  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(",").join(" ");
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select("-__v"); // Exclude __v by default
    }
    return this;
  }

  paginate() {
    const page = parseInt(this.queryString.page, 10) || 1;
    const limit = parseInt(this.queryString.limit, 10) || 100; // Default limit
    const skip = (page - 1) * limit;
    this.query = this.query.skip(skip).limit(limit);
    return this;
  }
}

module.exports = APIFeatures;
