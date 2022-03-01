const router = require("express").Router();

router.use(require("./public"));
router.use(require("./cardGen"));

module.exports = router;