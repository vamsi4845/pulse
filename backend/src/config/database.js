import mongoose from 'mongoose';

export async function connectDatabase() {
  if (!process.env.MONGODB_URI) {
    console.error('MongoDB connection error: MONGODB_URI environment variable is not set');
    console.error('Please set MONGODB_URI in your .env file');
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI;
  const uriWithoutPassword = uri.replace(/:[^:@]+@/, ':****@');
  console.log(`Attempting to connect to MongoDB: ${uriWithoutPassword}`);

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    
    if (error.code === 8000 || error.codeName === 'AtlasError') {
      console.error('\n⚠️  MongoDB Atlas Authentication Failed');
      console.error('Please check your MONGODB_URI in the .env file:');
      console.error('\nCommon issues:');
      console.error('1. Username/Password: Verify credentials are correct');
      console.error('   - Special characters in password must be URL-encoded');
      console.error('   - Example: @ becomes %40, # becomes %23');
      console.error('2. IP Whitelist: Add your IP address in MongoDB Atlas');
      console.error('   - Go to: Network Access > Add IP Address');
      console.error('   - Or temporarily allow access from anywhere (0.0.0.0/0)');
      console.error('3. Connection String Format:');
      console.error('   mongodb+srv://<username>:<password>@cluster.mongodb.net/<database>?retryWrites=true&w=majority');
      console.error('\nTo get your connection string:');
      console.error('1. Go to MongoDB Atlas > Connect > Connect your application');
      console.error('2. Copy the connection string');
      console.error('3. Replace <password> with your actual password (URL-encoded if needed)');
      console.error('4. Replace <database> with your database name');
    } else if (error.message.includes('authentication failed')) {
      console.error('\n⚠️  Authentication Failed');
      console.error('Please verify your MongoDB credentials in MONGODB_URI');
      console.error('Make sure username and password are correct and URL-encoded');
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
      console.error('\n⚠️  DNS Resolution Failed');
      console.error('Check your internet connection and MongoDB Atlas cluster status');
    }
    
    process.exit(1);
  }
}

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

mongoose.connection.on('error', (error) => {
  console.error('MongoDB error:', error);
});

