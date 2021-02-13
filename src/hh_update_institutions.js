var csv_parse = require("csv-parse/lib/sync");
var fs = require("fs");

var PROVINCE_MAPPING = {
    "EC": "ZA-EC",
    "Eastern Cape": "ZA-EC",
    "FS": "ZA-FS",
    "Free State": "ZA-FS",
    "GP": "ZA-GT",
    "Gauteng": "ZA-GT",
    "KZN": "ZA-NL",
    "KwaZulu-Natal": "ZA-NL",
    "LP": "ZA-LP",
    "Limpopo": "ZA-LP",
    "MP": "ZA-MP",
    "Mpumalanga": "ZA-MP",
    "NW": "ZA-NW",
    "North West": "ZA-NW",
    "NC": "ZA-NC",
    "Northern Cape": "ZA-NC",
    "WC": "ZA-WC",
    "Western Cape": "ZA-WC",
};

var data = {};
process.argv.slice(2).forEach(function(filename) {
    csv_parse(fs.readFileSync(filename), {columns: true}).forEach(function(record) {
        var normalised_record = {};
        Object.entries(record).forEach(function(i) {
            var key = i[0];
            var value = i[1];
            normalised_record[key.trim().toLowerCase()] = value.trim();
        });
        var province = PROVINCE_MAPPING[normalised_record.province];
        var institution = normalised_record.university || normalised_record.tvet || normalised_record.phei;
        var campus = normalised_record.campus;
        if(!data[province]) {
            data[province] = {};
        }
        if(!data[province][institution]) {
            data[province][institution] = [];
        }
        data[province][institution].push(campus);
        data[province][institution].sort();
    });
});

function getOrderedKeys(object) {
    var keys = [];
    Object.keys(object).sort().forEach(function(key){
        keys.push(key);
        var value = object[key];
        if(!Array.isArray(value)) {
            keys = keys.concat(getOrderedKeys(value));
        }
    });
    return keys;
}

var serialised = JSON.stringify(data, getOrderedKeys(data), 2);
serialised = "go.institutions = " + serialised + ";";
fs.writeFileSync("src/higher_health_institutions.js", serialised);
