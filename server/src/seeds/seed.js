import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from '../config/db.js';

import State from '../models/State.js';
import Category from '../models/Category.js';
import Qualification from '../models/Qualification.js';
import ExamType from '../models/ExamType.js';
import Subject from '../models/Subject.js';
import Topic from '../models/Topic.js';
import ExamTopic from '../models/ExamTopic.js';
import VideoLink from '../models/VideoLink.js';
import Job from '../models/Job.js';

import states from './states.js';
import categories from './categories.js';
import qualifications from './qualifications.js';
import examTypes from './examTypes.js';
import subjects from './subjects.js';
import topics from './topics.js';
import examTopics from './examTopics.js';
import videoLinks from './videoLinks.js';
import mockJobs from './mockJobs.js';

dotenv.config();

const seedCollection = async (Model, data, name) => {
  try {
    const count = await Model.countDocuments();
    if (count > 0) {
      console.log(`  ${name}: Already seeded (${count} docs), skipping`);
      return;
    }
    const result = await Model.insertMany(data, { ordered: false });
    console.log(`  ${name}: Seeded ${result.length} documents`);
  } catch (error) {
    if (error.code === 11000) {
      console.log(`  ${name}: Some duplicates found, partial seed completed`);
    } else {
      console.error(`  ${name}: Error -`, error.message);
    }
  }
};

const seedTopics = async () => {
  try {
    const count = await Topic.countDocuments();
    if (count > 0) {
      console.log(`  Topics: Already seeded (${count} docs), skipping`);
      return;
    }
    const subjectDocs = await Subject.find();
    const subjectMap = {};
    subjectDocs.forEach(s => { subjectMap[s.name] = s._id; });

    const topicsWithSubject = topics.map(t => ({
      ...t,
      subject: subjectMap[t.subjectName],
    })).filter(t => t.subject);

    const result = await Topic.insertMany(topicsWithSubject, { ordered: false });
    console.log(`  Topics: Seeded ${result.length} documents`);
  } catch (error) {
    if (error.code === 11000) {
      console.log(`  Topics: Some duplicates found, partial seed completed`);
    } else {
      console.error(`  Topics: Error -`, error.message);
    }
  }
};

const seedVideoLinks = async () => {
  try {
    const count = await VideoLink.countDocuments();
    if (count > 0) {
      console.log(`  VideoLinks: Already seeded (${count} docs), skipping`);
      return;
    }
    const topicDocs = await Topic.find();
    const topicMap = {};
    topicDocs.forEach(t => { topicMap[t.name] = t._id; });
    const videosWithTopic = videoLinks.map(v => ({
      topic: topicMap[v.topicName],
      title: v.title,
      youtubeVideoId: v.youtubeVideoId,
      youtubeUrl: v.youtubeUrl || `https://www.youtube.com/watch?v=${v.youtubeVideoId}`,
      channelName: v.channelName,
      language: v.language || 'english',
      quality: v.quality,
      isVerified: v.isVerified !== false,
    })).filter(v => v.topic);
    const result = await VideoLink.insertMany(videosWithTopic, { ordered: false });
    console.log(`  VideoLinks: Seeded ${result.length} documents`);
  } catch (error) {
    if (error.code === 11000) {
      console.log(`  VideoLinks: Some duplicates found, partial seed completed`);
    } else {
      console.error(`  VideoLinks: Error -`, error.message);
    }
  }
};

const seedExamTopics = async () => {
  try {
    const count = await ExamTopic.countDocuments();
    if (count > 0) {
      console.log(`  ExamTopics: Already seeded (${count} docs), skipping`);
      return;
    }
    const examDocs = await ExamType.find();
    const subjectDocs = await Subject.find();
    const topicDocs = await Topic.find();
    const examMap = {};
    const subjectMap = {};
    const topicMap = {};
    examDocs.forEach(e => { examMap[e.slug] = e._id; });
    subjectDocs.forEach(s => { subjectMap[s.slug] = s._id; });
    topicDocs.forEach(t => { topicMap[t.slug] = t._id; });

    let seeded = 0;
    for (const et of examTopics) {
      const examType = examMap[et.examSlug];
      const subject = subjectMap[et.subjectSlug];
      if (!examType || !subject) continue;
      const topicsArr = (et.topics || []).map(x => ({
        topic: topicMap[x.topicSlug],
        weightage: x.weightage,
        isOptional: !!x.isOptional,
      })).filter(x => x.topic);
      try {
        await ExamTopic.create({
          examType, subject, topics: topicsArr,
          totalMarks: et.totalMarks, totalQuestions: et.totalQuestions,
        });
        seeded++;
      } catch (e) {
        if (e.code !== 11000) console.error(`  ExamTopics: Error ${et.examSlug}/${et.subjectSlug}:`, e.message);
      }
    }
    console.log(`  ExamTopics: Seeded ${seeded} documents`);
  } catch (error) {
    console.error(`  ExamTopics: Error -`, error.message);
  }
};

const seedJobs = async () => {
  try {
    const count = await Job.countDocuments();
    if (count > 0) {
      console.log(`  Jobs: Already seeded (${count} docs), skipping`);
      return;
    }
    let seeded = 0;
    for (const jobData of mockJobs) {
      try {
        await Job.create(jobData);
        seeded++;
      } catch (e) {
        if (e.code !== 11000) {
          console.error(`  Jobs: Error seeding "${jobData.title}":`, e.message);
        }
      }
    }
    console.log(`  Jobs: Seeded ${seeded} documents`);
  } catch (error) {
    console.error(`  Jobs: Error -`, error.message);
  }
};

const seed = async () => {
  console.log('Starting seed...\n');
  await connectDB();

  console.log('Seeding reference data:');
  await seedCollection(State, states, 'States');
  await seedCollection(Category, categories, 'Categories');
  await seedCollection(Qualification, qualifications, 'Qualifications');
  await seedCollection(ExamType, examTypes, 'Exam Types');
  await seedCollection(Subject, subjects, 'Subjects');

  console.log('\nSeeding relational data:');
  await seedTopics();
  await seedExamTopics();
  await seedVideoLinks();

  console.log('\nSeeding job data:');
  await seedJobs();

  console.log('\nSeed completed!');
  process.exit(0);
};

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
