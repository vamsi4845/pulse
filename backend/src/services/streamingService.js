import { getObjectStream, getObjectMetadata } from './s3Service.js';

export async function streamVideo(s3Key, range) {
  const metadata = await getObjectMetadata(s3Key);
  const fileSize = metadata.contentLength;

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = end - start + 1;

    const stream = await getObjectStream(s3Key);
    
    return {
      stream,
      start,
      end,
      chunksize,
      fileSize,
      contentType: metadata.contentType,
      statusCode: 206,
    };
  }

  const stream = await getObjectStream(s3Key);
  
  return {
    stream,
    start: 0,
    end: fileSize - 1,
    chunksize: fileSize,
    fileSize,
    contentType: metadata.contentType,
    statusCode: 200,
  };
}

