const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

const changePassword = async () => {
  const args = process.argv.slice(2);
  const email = args[0] || 'admin@lfes.com';
  const newPassword = args[1];

  if (!newPassword) {
    console.error('Error: Please provide a new password.');
    console.log('\nUsage:');
    console.log('  node scripts/change-password.js <email> <new_password>');
    console.log('\nExample:');
    console.log('  node scripts/change-password.js admin@lfes.com mynewsecurepassword\n');
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB...');

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      console.error(`Error: User with email ${email} not found.`);
      process.exit(1);
    }

    user.password = newPassword;
    await user.save();

    console.log(`\nPassword updated successfully for: ${email}`);
    process.exit(0);
  } catch (error) {
    console.error('Error updating password:', error);
    process.exit(1);
  }
};

changePassword();
