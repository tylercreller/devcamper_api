const geocoder = require('../utils/geocoder');
const Bootcamp = require('../models/Bootcamp');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const path = require('path');

// @desc		Get All bootcamps
// @route		GET /api/v1/bootcamps
// @access	Public
exports.getBootcamps = asyncHandler(async (req, res, next) => {
	res.status(200).json(res.advancedResults);
});

// @desc		Get Single bootcamp
// @route		GET /api/v1/bootcamps/:id
// @access	Public
exports.getBootcamp = asyncHandler(async (req, res, next) => {
	const bootcamp = await Bootcamp.findById(req.params.id);
	if (!bootcamp) {
		return next(
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
		return next(
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
	const bootcamp = await Bootcamp.findById(req.params.id);

	if (!bootcamp) {
		return next(
			new ErrorResponse(`Bootcamp not found with id of ${req.params.id}`, 404)
		);
	}

	bootcamp.remove();

	res.status(200).json({ success: true, data: {} });
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

// @desc		Upload Photo for bootcamp
// @route		PUT /api/v1/bootcamps/:id/photo
// @access	Private
exports.bootcampPhotoUpload = asyncHandler(async (req, res, next) => {
	const bootcamp = await Bootcamp.findById(req.params.id);

	if (!bootcamp) {
		return next(
			new ErrorResponse(`Bootcamp not found with id of ${req.params.id}`, 404)
		);
	}

	if (!req.files) {
		return next(new ErrorResponse(`Please upload a file`, 400));
	}

	const file = req.files.file;

	// Make sure the file is a photo
	if (!file.mimetype.startsWith('image/')) {
		return next(new ErrorResponse(`Please upload an image`, 400));
	}

	// Check file size
	if (file.size > process.env.MAX_FILE_UPLOAD) {
		return next(
			new ErrorResponse(
				`Please upload an less than ${process.env.MAX_FILE_UPLOAD}`,
				400
			)
		);
	}

	// Create custom file name
	file.name = `photo_${bootcamp._id}${path.parse(file.name).ext}`;

	file.mv(`${process.env.FILE_UPLOAD_PATH}/${file.name}`, async err => {
		if (err) {
			console.error(err);
			return next(new ErrorResponse(`Problem with file upload`, 500));
		}

		await Bootcamp.findByIdAndUpdate(req.params.id, { photo: file.name });
		res.status(200).json({
			success: true,
			data: file.name
		});
	});
});
