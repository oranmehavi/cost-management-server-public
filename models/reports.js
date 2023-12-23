const mongoose = require('mongoose');
const Schema = mongoose.Schema;

//This excludes unwanted properties in the returned report object
const reshapingOptions = {

    // exclude .id (it's a virtual)
    virtuals: false,

    // exclude .__v
    versionKey: false,

    // exclude ._id, month,year, user_id
    transform: function (doc, ret) {
        delete ret._id;
        delete ret.month;
        delete ret.year;
        delete ret.user_id;
        return ret;
    },

};

// This is the report schema
const ReportSchema = new Schema({
    user_id: {
        type: Number
    },
    month: {
        type: Number
    },
    year: {
      type: Number
    },
    food: {
        type: Array
    },
    health: {
        type: Array
    },
    housing: {
        type: Array
    },
    sport: {
        type: Array
    },
    education: {
        type: Array
    },
    transportation: {
        type: Array
    },
    other: {
        type: Array
    }

}, {toJSON: reshapingOptions});

const Report = mongoose.model('reports', ReportSchema);

module.exports = Report;