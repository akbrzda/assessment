const { publicRouter, internalRouter } = require("./routes");

module.exports = { routes: publicRouter, internalRoutes: internalRouter };
