const express = require('express');
const router = express.Router();

// Get academic plan
router.get('/', (req, res) => {
  try {
    // This would fetch from database
    res.json({
      success: true,
      data: {
        semesters: [],
        plannedCourses: {}
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch academic plan' });
  }
});

// Save academic plan
router.post('/', (req, res) => {
  try {
    const { semesters, plannedCourses } = req.body;
    // Save to database
    res.json({
      success: true,
      message: 'Academic plan saved successfully'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save academic plan' });
  }
});

module.exports = router; 