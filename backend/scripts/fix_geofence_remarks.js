const mongoose = require('mongoose');
require('dotenv').config();

const StaffAttendance = require('../models/StaffAttendance');

async function fixGeofenceRemarks() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/lbs_school';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB:', mongoUri.split('@').pop());

    const records = await StaffAttendance.find({
      remarks: { $regex: /Self marked via Geofencing/i }
    });

    console.log(`Found ${records.length} geofence records to check.`);
    let updatedCount = 0;

    for (const record of records) {
      if (record.createdAt) {
        const istTime = new Date(record.createdAt).toLocaleTimeString('en-US', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });

        const newRemark = `Self marked via Geofencing at ${istTime}`;
        if (record.remarks !== newRemark) {
          console.log(`Updating record ${record._id}: "${record.remarks}" -> "${newRemark}"`);
          record.remarks = newRemark;
          await record.save();
          updatedCount++;
        }
      }
    }

    console.log(`Successfully updated ${updatedCount} geofence attendance records.`);
  } catch (err) {
    console.error('Error updating records:', err);
  } finally {
    await mongoose.disconnect();
  }
}

fixGeofenceRemarks();
