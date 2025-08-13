// Generally less useful with granular RBAC, removed specific logging
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const APIFeatures = require("../utils/apiFeatures");

exports.deleteOne = (Model, modelName = "document") =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id);
    if (!doc) return next(new AppError(`No ${modelName} found with ID`, 404));
    res.status(204).json({ status: "success", data: null });
  });

exports.updateOne = (Model, modelName = "document") =>
  catchAsync(async (req, res, next) => {
    if (req.body.role_id) delete req.body.role_id; // Prevent role update here
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!doc) return next(new AppError(`No ${modelName} found with ID`, 404));
    res.status(200).json({ status: "success", data: { data: doc } });
  });

exports.createOne = (Model, modelName = "document") =>
  catchAsync(async (req, res, next) => {
    if (Model.schema.paths["created_by"] && req.user) {
      req.body.created_by = req.user._id;
    }
    const doc = await Model.create(req.body);
    res.status(201).json({ status: "success", data: { data: doc } });
  });

exports.getOne = (Model, modelName = "document", popOptions) =>
  catchAsync(async (req, res, next) => {
    let query = Model.findById(req.params.id);
    if (popOptions) query = query.populate(popOptions);
    const doc = await query;
    if (!doc) return next(new AppError(`No ${modelName} found with ID`, 404));
    res.status(200).json({ status: "success", data: { data: doc } });
  });

exports.getAll = (Model, modelName = "document", popOptions) =>
  catchAsync(async (req, res, next) => {
    let filter = {};
    let query = Model.find(filter);
    if (popOptions) query = query.populate(popOptions);
    const features = new APIFeatures(query, req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();
    const doc = await features.query;
    res
      .status(200)
      .json({ status: "success", results: doc.length, data: { data: doc } });
  });
