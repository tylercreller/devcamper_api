const geocoder = require('../utils/geocoder');
const Bootcamp = require('../models/Bootcamp');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');

// @desc		Get All bootcamps
// @route		GET /api/v1/bootcamps
// @access	Public
exports.getBootcamps = asyncHandler(async (req, res, next) => {
	let query;

	const reqQuery = { ...req.query };

	// Fields to exclude
	const removeFields = ['select', 'sort', 'page', 'limit'];

	removeFields.forEach(param => delete reqQuery[param]);

	let queryStr = JSON.stringify(reqQuery);

	queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);
	query = Bootcamp.find(JSON.parse(queryStr));

	// Select fields
	if (req.query.select) {
		query.select(req.query.select.split(',').join(' '));
	}

	if (req.query.sort) {
		query.sort(req.query.sort.split(',').join(' '));
	} else {
		query.sort('-createdAt');
	}

	// Pagination
	const page = parseInt(req.query.page, 10) || 1;
	const limit = parseInt(req.query.limit, 10) || 25;
	const startIndex = (page - 1) * limit;
	const endIndex = page * limit;
	const total = await Bootcamp.countDocuments();
	query.skip(startIndex).limit(limit);

	const bootcamps = await query;

	// Pagination result
	const pagination = {};
	if (endIndex < total) {
		pagination.next = {
			page: page + 1,
			limit
		};
	}

	if (startIndex > 0) {
		pagination.prev = {
			page: page - 1,
			limit
		};
	}

	res.status(200).json({ success: true, pagination, data: bootcamps });
});

// @desc		Get Single bootcamp
// @route		GET /api/v1/bootcamps/:id
// @access	Public
exports.getBootcamp = asyncHandler(async (req, res, next) => {
	const bootcamp = await Bootcamp.findById(req.params.id);
	if (!bootcamp) {
		next(
			new ErrorResponse(`Bootcamp not found with id of ${req.params.id}`, 404)
		);
	} else {
		res.status(200).json({ success: true, data: bootcamp });
	}
});

// @desc		Create New bootcamp
// @route		POST /api/v1/bootcamps
// @access	Private
exports.createBootcamp = asyncHandler(async (req, res, next) => {
	const bootcamp = await Bootcamp.create(req.body);

	res.status(201).json({
		sucess: true,
		data: bootcamp
	});
});

// @desc		Update bootcamp
// @route		PUT /api/v1/bootcamps/:id
// @access	Private
exports.updateBootcamp = asyncHandler(async (req, res, next) => {
	const bootcamp = await Bootcamp.findByIdAndUpdate(req.params.id, req.body, {
		new: true,
		runValidators: true
	});
	if (!bootcamp) {
		next(
			new ErrorResponse(`Bootcamp not found with id of ${req.params.id}`, 404)
		);
	} else {
		res.status(200).json({ success: true, data: bootcamp });
	}
});

// @desc		Delete bootcamp
// @route		DELETE /api/v1/bootcamps/:id
// @access	Private
exports.deleteBootcamp = asyncHandler(async (req, res, next) => {
	const bootcamp = await Bootcamp.findByIdAndDelete(req.params.id);

	if (!bootcamp) {
		next(
			new ErrorResponse(`Bootcamp not found with id of ${req.params.id}`, 404)
		);
	} else {
		res.status(200).json({ success: true, data: {} });
	}
});

// @desc		Get bootcamps within a radius
// @route		GET /api/v1/bootcamps/radius/:zipcode/:distance
// @access	Private
exports.getBootcampsInRadius = asyncHandler(async (req, res, next) => {
	const { zipCode, distance } = req.params;

	// Get lat/lng from geocoder
	const loc = await geocoder.geocode(zipCode);
	const lat = loc[0].latitude;
	const lng = loc[0].longitude;

	// Calc radius using radians
	// Divide distance by radius of earth
	// Earth radius 3,963 mi
	const radius = distance / 3963;

	const bootcamps = await Bootcamp.find({
		location: {
			$geoWithin: { $centerSphere: [[lng, lat], radius] }
		}
	});

	res.status(200).json({
		success: true,
		count: bootcamps.length,
		data: bootcamps
	});
});
