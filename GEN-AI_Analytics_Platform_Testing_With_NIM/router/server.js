const approuter = require('@sap/approuter');

const ar = approuter();

ar.start({
  port: process.env.PORT || 5000
});
