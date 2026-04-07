const pdf = require('pdf-parse');
console.log("TYPE:", typeof pdf);
console.log("KEYS:", Object.keys(pdf));
if (typeof pdf === 'object') {
    console.log("DEFAULT:", typeof pdf.default);
}
