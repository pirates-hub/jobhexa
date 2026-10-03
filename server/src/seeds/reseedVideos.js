import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from '../config/db.js';
import Topic from '../models/Topic.js';
import VideoLink from '../models/VideoLink.js';
import videoLinks from './videoLinks.js';

dotenv.config();

// Clears old VideoLinks (which contain duplicated / dead youtube IDs)
// and re-inserts the fresh unique list from videoLinks.js
const reseedVideos = async () => {
  console.log('Reseeding video links...\n');
  await connectDB();

  const topicDocs = await Topic.find();
  if (topicDocs.length === 0) {
    console.error('No topics found. Run `npm run seed` first so Topics exist.');
    process.exit(1);
  }
  const topicMap = {};
  topicDocs.forEach((t) => { topicMap[t.name] = t._id; });

  const seenIds = new Set();
  const videosWithTopic = [];
  const skipped = [];

  for (const v of videoLinks) {
    if (!topicMap[v.topicName]) {
      skipped.push(`${v.topicName} (topic not found)`);
      continue;
    }
    if (seenIds.has(v.youtubeVideoId)) {
      skipped.push(`${v.youtubeVideoId} (duplicate id in seed file)`);
      continue;
    }
    seenIds.add(v.youtubeVideoId);
    videosWithTopic.push({
      topic: topicMap[v.topicName],
      title: v.title,
      youtubeVideoId: v.youtubeVideoId,
      youtubeUrl: v.youtubeUrl || `https://www.youtube.com/watch?v=${v.youtubeVideoId}`,
      channelName: v.channelName,
      language: v.language || 'english',
      quality: v.quality,
      isVerified: v.isVerified !== false,
    });
  }

  await VideoLink.deleteMany({});
  console.log('  Old VideoLinks cleared');

  const result = await VideoLink.insertMany(videosWithTopic, { ordered: false });
  console.log(`  VideoLinks: Reseeded ${result.length} documents`);

  if (skipped.length > 0) {
    console.log(`  Skipped ${skipped.length}:`);
    skipped.forEach((s) => console.log(`    - ${s}`));
  }

  console.log('\nReseed completed!');
  process.exit(0);
};

reseedVideos().catch((err) => {
  console.error('Reseed failed:', err);
  process.exit(1);
});
