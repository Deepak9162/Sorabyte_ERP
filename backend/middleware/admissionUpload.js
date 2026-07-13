const uploadConfig = require('../config/multerConfig');

const admissionUpload = (req, res, next) => {
  const uploadFields = uploadConfig.fields([
    { name: 'studentPhoto', maxCount: 1 },
    { name: 'birthCertificate', maxCount: 1 },
    { name: 'transferCertificate', maxCount: 1 },
    { name: 'previousMarksheet', maxCount: 1 },
    { name: 'aadharCard', maxCount: 1 },
    { name: 'studentPhotograph', maxCount: 1 },
    { name: 'parentPhotograph', maxCount: 1 },
    { name: 'otherDocuments', maxCount: 1 }
  ]);

  uploadFields(req, res, function (err) {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || 'An error occurred during file upload.'
      });
    }

    // Initialize document/photo objects in req.body if not present
    if (!req.body.studentInfo) req.body.studentInfo = {};
    if (!req.body.documents) req.body.documents = {};

    // If text fields are JSON strings, parse them
    const jsonFields = ['studentInfo', 'parentInfo', 'address', 'emergencyContact', 'medicalInfo', 'transport', 'hostel', 'additionalNotes'];
    jsonFields.forEach(field => {
      if (req.body[field] && typeof req.body[field] === 'string') {
        try {
          req.body[field] = JSON.parse(req.body[field]);
        } catch (e) {
          // Keep as string or handle error if required
        }
      }
    });

    // Populate file paths
    if (req.files) {
      if (req.files['studentPhoto']) {
        req.body.studentInfo.studentPhoto = `/uploads/students/${req.files['studentPhoto'][0].filename}`;
      }
      if (req.files['studentPhotograph']) {
        req.body.documents.studentPhotograph = `/uploads/students/${req.files['studentPhotograph'][0].filename}`;
      }
      if (req.files['birthCertificate']) {
        req.body.documents.birthCertificate = `/uploads/students/${req.files['birthCertificate'][0].filename}`;
      }
      if (req.files['transferCertificate']) {
        req.body.documents.transferCertificate = `/uploads/students/${req.files['transferCertificate'][0].filename}`;
      }
      if (req.files['previousMarksheet']) {
        req.body.documents.previousMarksheet = `/uploads/students/${req.files['previousMarksheet'][0].filename}`;
      }
      if (req.files['aadharCard']) {
        req.body.documents.aadharCard = `/uploads/students/${req.files['aadharCard'][0].filename}`;
      }
      if (req.files['parentPhotograph']) {
        req.body.documents.parentPhotograph = `/uploads/students/${req.files['parentPhotograph'][0].filename}`;
      }
      if (req.files['otherDocuments']) {
        req.body.documents.otherDocuments = `/uploads/students/${req.files['otherDocuments'][0].filename}`;
      }
    }

    next();
  });
};

module.exports = admissionUpload;
