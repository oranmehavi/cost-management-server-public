const express = require('express');
const router = express.Router();
const Cost = require('../models/costs');
const User = require('../models/user');
const Report = require('../models/reports');


router.get('/report',async function(req,res,next){


    //check if the user is trying to get a report for a future date

    if (new Date().getFullYear() < Number(req.query.year)) {
       return res.status(500).json({error: 'Cannot get a report for a future month/year'});
    }
    else if (new Date().getFullYear() === Number(req.query.year) && new Date().getMonth() + 1 < Number(req.query.month)) {
       return res.status(500).json({error: 'Cannot get a report for a future month/year'});
    }

    try {
        //check if user exists
        const userExists = await checkUserExists(req.query.user_id);
        if (!userExists)
        {
            return res.status(500).json({error: 'User does not exist'});
        }

        let existingReport = await checkReportExists(req.query.user_id, req.query.month, req.query.year);

        /*
        checks if there is an existing report
         */
        if (existingReport) {
            const costs = await getCosts(req.query.user_id, req.query.month, req.query.year);
            const numOfCostsInReport = existingReport.food.length + existingReport.health.length + existingReport.housing.length + existingReport.sport.length +
                existingReport.education.length + existingReport.transportation.length + existingReport.other.length;

            //if there is an existing report then check if the costs are the same as on the report
            if (costs.length === numOfCostsInReport) {
                return res.status(200).json(existingReport);
            }
            // else then update the report with the new costs
            else {
                existingReport = updateExistingReport(existingReport, costs);
                existingReport.save(function(error, report) {
                    if (error) {
                        return res.status(500).json({error: error});
                    }
                    else {
                        return res.status(200).json(report);
                    }
                });
            }
        }
        // if there is no existing report
        else {
            const costs = await getCosts(req.query.user_id, req.query.month, req.query.year);

            // if there are no costs then create an empty report
            if (costs.length === 0) {
                const report = new Report({user_id: req.query.user_id, month: req.query.month, year: req.query.year, food: [],
                    health: [], housing: [], sport: [], education: [], transportation: [], other: []});
                report.save(function(error, report) {
                    if (error) {
                        return res.status(500).json({error: error});
                    }
                    else {
                        return res.status(200).json(report);
                    }
                });
            }
            // else generate a new report
            else {
                const newReport = generateReport(req.query, costs);

                newReport.save(function(error, report) {
                    if (error) {
                        console.log(error);
                        return res.status(500).json({error: error});
                    }
                    else {
                        return res.status(200).json(report);
                    }
                });
            }
        }
    }
    catch (error) {
        return res.status(500).json({error: error});
    }

});

//get the team details
router.get('/about', function(req, res, next){
    const jsonText = '[{"firstname":"Oran","lastname":"Mehavi","id":315940999,"email":"oranhero@gmail.com"},' +
        '{"firstname":"Noam","lastname":"Rippa","id":206280695,"email":"noamrippa18@gmail.com"} ]';
    return res.status(200).json(JSON.parse(jsonText));
});

router.post('/addcost',async function(req,res,next){


    try {
        let day = req.body.day;

        let month = req.body.month;
        let year = req.body.year;

        if (!year || !month || !day) {
            const currentDate = new Date();
            day = currentDate.getDate();
            console.log(day);
            month = currentDate.getMonth() + 1;
            year = currentDate.getFullYear();
        } else {

            if (Number(month) === 0) {
                return
            }
            month = new Date(`${month} 1, ${year}`).getMonth() + 1;

            // Check if the day is within the range of valid days for the given month and year
            const lastDayOfMonth = new Date(year, month, 0).getDate();
            if (day > lastDayOfMonth) {
                return res.status(500).send({ error: 'Invalid day for the given month and year' });
            }


            // check if the user is trying to get a report for a future date
            if (new Date().getFullYear() < year) {
                return res.status(500).json({error: 'Cannot add a cost for a future date'});
            }
            if (new Date().getFullYear() === Number(year)) {
                if (new Date().getMonth() + 1 === Number(month) && new Date().getDate() < day) {
                    return res.status(500).json({error: 'Cannot add a cost for a future date'});
                }
                else if (new Date().getMonth() + 1 < month) {
                    return res.status(500).json({error: 'Cannot add a cost for a future date'});
                }
            }
        }

        //check if user_id exists in the DB
        const userExists = await checkUserExists(req.body.user_id);
        if (!userExists)
        {
            return res.status(500).json({error: 'User does not exist'});
        }

        //generate an id based on the time and date of the request
        const hours = ('0' + new Date().getHours()).slice(-2);
        const minutes = ('0' + new Date().getMinutes()).slice(-2);
        const seconds = ('0' + new Date().getSeconds()).slice(-2);
        const milliseconds = ('00' + new Date().getMilliseconds()).slice(-3);
        const generatedId = year + month + day + hours + minutes + seconds + milliseconds;

        //create a cost and save it in the DB
        const c = new Cost({user_id: req.body.user_id, year: year, month: month, day: day, id: generatedId, description: req.body.description,
            category: req.body.category, sum: req.body.sum});
        c.save(function(error, cost){
            if (error) {
                if (error.name === 'ValidationError') {
                   return res.status(500).json({error: Object.values(error.errors).map(val => val.message)[0]});
                }
            }
            else {
               return res.status(200).json(cost);
            }
        });
    }
    catch(error) {
        return res.status(500).json({error:error});
    }

});

//check if user exists
async function checkUserExists(userId) {
    const count = await User.countDocuments({id: userId});
    if(count>0){
        return true;
    }
    return false;

}

//check if report exists
async function checkReportExists(userId, month, year) {
    const report = await Report.findOne({id: userId, month: month, year: year});
    return report;

}

//get all the costs
async function getCosts(userId, month, year) {
    const costs = await Cost.find({user_id: userId, month: month, year: year});
    return costs;

}

//generate a new report
function generateReport(parameters, costs) {
    const healthArr = [];
    const foodArr = [];
    const housingArr = [];
    const sportArr = [];
    const educationArr = [];
    const transportationArr = [];
    const otherArr = [];


    costs.forEach(cost => {
        switch (cost.category) {
            case 'health':
                healthArr.push({day: cost.day, description: cost.description, sum: cost.sum});
                break;
            case 'food':
                foodArr.push({day: cost.day, description: cost.description, sum: cost.sum});
                break;
            case 'housing':
                housingArr.push({day: cost.day, description: cost.description, sum: cost.sum});
                break;
            case 'sport':
                sportArr.push({day: cost.day, description: cost.description, sum: cost.sum});
                break;
            case 'education':
                educationArr.push({day: cost.day, description: cost.description, sum: cost.sum});
                break;
            case 'transportation':
                transportationArr.push({day: cost.day, description: cost.description, sum: cost.sum});
                break;
            case 'other':
                otherArr.push({day: cost.day, description: cost.description, sum: cost.sum});
                break;
        }
    });
    const report = new Report({user_id: parameters.user_id, month: parameters.month, year: parameters.year, food: foodArr,
        health: healthArr, housing: housingArr, sport: sportArr, education: educationArr, transportation: transportationArr, other: otherArr});

    return report;
}

//updates an existing report
function updateExistingReport(report, costs) {
    const healthArr = [];
    const foodArr = [];
    const housingArr = [];
    const sportArr = [];
    const educationArr = [];
    const transportationArr = [];
    const otherArr = [];

    costs.forEach(cost => {
        switch (cost.category) {
            case 'health':
                healthArr.push({day: cost.day, description: cost.description, sum: cost.sum});
                break;
            case 'food':
                foodArr.push({day: cost.day, description: cost.description, sum: cost.sum});
                break;
            case 'housing':
                housingArr.push({day: cost.day, description: cost.description, sum: cost.sum});
                break;
            case 'sport':
                sportArr.push({day: cost.day, description: cost.description, sum: cost.sum});
                break;
            case 'education':
                educationArr.push({day: cost.day, description: cost.description, sum: cost.sum});
                break;
            case 'transportation':
                transportationArr.push({day: cost.day, description: cost.description, sum: cost.sum});
                break;
            case 'other':
                otherArr.push({day: cost.day, description: cost.description, sum: cost.sum});
                break;
        }
    });

    //updates the categories array
    report.food = foodArr;
    report.health = healthArr;
    report.transportation = transportationArr;
    report.sport = sportArr;
    report.other = otherArr;
    report.housing = housingArr;
    report.education = educationArr;

    return report;

}

module.exports = router;


