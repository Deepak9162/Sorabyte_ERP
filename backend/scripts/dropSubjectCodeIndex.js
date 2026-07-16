const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB.');
    
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    const hasSubjects = collections.some(col => col.name === 'subjects');
    if (!hasSubjects) {
      console.log('Collection "subjects" does not exist.');
      process.exit(0);
    }

    const indexes = await db.collection('subjects').indexes();
    console.log('Current indexes on subjects:', indexes);
    
    const codeIndexExists = indexes.some(idx => idx.name === 'code_1');
    if (codeIndexExists) {
      console.log('Dropping index code_1...');
      await db.collection('subjects').dropIndex('code_1');
      console.log('Dropped index code_1 successfully.');
    } else {
      console.log('Index code_1 not found.');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected.');
  }
};

run();
