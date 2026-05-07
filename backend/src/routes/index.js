// Re-export all routers for clean imports in index.js
const authRoutes           = require('./auth');
const electionsRouter      = require('./elections');
const { communityRouter, duesRouter, complianceRouter, violationsRouter,
        maintenanceRouter, vendorRouter, residentRouter, documentRouter,
        commRouter, accountingRouter, taxRouter } = require('./all');

module.exports = {
  authRoutes, communityRouter, duesRouter, complianceRouter,
  violationsRouter, maintenanceRouter, vendorRouter, residentRouter,
  documentRouter, commRouter, accountingRouter, taxRouter, electionsRouter
};
