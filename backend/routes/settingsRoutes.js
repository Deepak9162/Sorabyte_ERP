const express = require('express');
const router = express.Router();
const InstituteSettings = require('../models/InstituteSettings');
const { protect, authorize } = require('../middleware/auth');

router.get('/working-days', protect, async (req, res) => {
  try {
    let settings = await InstituteSettings.findOne();
    if (!settings) {
      settings = await InstituteSettings.create({});
    }
    res.status(200).json({ success: true, data: settings.workingDays });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/working-days', protect, authorize('admin'), async (req, res) => {
  try {
    const { workingDays } = req.body;
    let settings = await InstituteSettings.findOne();
    if (!settings) {
      settings = new InstituteSettings();
    }
    settings.workingDays = workingDays;
    await settings.save();
    res.status(200).json({ success: true, data: settings.workingDays });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
