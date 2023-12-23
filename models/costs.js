const mongoose = require('mongoose');
const Schema = mongoose.Schema;

//This is the Cost Schema
const CostsSchema = new Schema({
    user_id: {
        type: Number
    },
    year: {
        type: Number
    },
    month: {
        type: Number
    },
    day: {
        type: Number
    },
    id: {
        type: String
    },
    description: {
        type: String
    },
    category: {
    type: String,
    enum: {
        values: ['food',
            'health',
            'housing',
            'sport',
            'education',
            'transportation',
            'other'],
        message: '{VALUE} is not a valid category'

    }
    },
    sum: {
        type: Number
    }
});

const Cost = mongoose.model('costs',CostsSchema);

module.exports = Cost;