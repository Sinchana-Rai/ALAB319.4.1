import express from "express";
import db from "../db/conn.mjs";
import { ObjectId } from "mongodb";

const router = express.Router();

/**
 * It is not best practice to seperate these routes
 * like we have done here. This file was created
 * specifically for educational purposes, to contain
 * all aggregation routes in one place.
 */

/**
 * Grading Weights by Score Type:
 * - Exams: 50%
 * - Quizes: 30%
 * - Homework: 20%
 */

// Get the weighted average of a specified learner's grades, per class
//Eg: http://localhost:5050/grades/learner/2/avg-class

router.get("/learner/:id/avg-class", async (req, res) => {
  let collection = await db.collection("grades");

  let result = await collection
    .aggregate([
      {
        $match: { learner_id: Number(req.params.id) },
      },
      {
        $unwind: { path: "$scores" },
      },
      {
        $group: {
          _id: "$class_id",
          quiz: {
            $push: {
              $cond: {
                if: { $eq: ["$scores.type", "quiz"] },
                then: "$scores.score",
                else: "$$REMOVE",
              },
            },
          },
          exam: {
            $push: {
              $cond: {
                if: { $eq: ["$scores.type", "exam"] },
                then: "$scores.score",
                else: "$$REMOVE",
              },
            },
          },
          homework: {
            $push: {
              $cond: {
                if: { $eq: ["$scores.type", "homework"] },
                then: "$scores.score",
                else: "$$REMOVE",
              },
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          class_id: "$_id",
          avg: {
            $sum: [
              { $multiply: [{ $avg: "$exam" }, 0.5] },
              { $multiply: [{ $avg: "$quiz" }, 0.3] },
              { $multiply: [{ $avg: "$homework" }, 0.2] },
            ],
          },
        },
      },
    ])
    .toArray();

  if (!result) res.send("Not found").status(404);
  else res.send(result).status(200);
});


// Create a GET route at /grades/stats
// Within this route, create an aggregation pipeline that returns the following information:
// The number of learners with a weighted average (as calculated by the existing routes) higher than 70%.
// The total number of learners.
// The percentage of learners with an average above 70% (a ratio of the above two outputs).
// eg: http://localhost:5050/grades_agg/stats

router.get("/stats", async (req, res) => {
    try {
      const collection = await db.collection("grades");
      if (!collection) {
        return res.status(500).send({ error: "Database collection not found" });
      }
  
      const result = await collection
        .aggregate([
          {
            $unwind: "$scores",
          },
          {
            $group: {
              _id: "$learner_id",
              quiz: {
                $push: {
                  $cond: [
                    { $eq: ["$scores.type", "quiz"] },
                    "$scores.score",
                    "$$REMOVE",
                  ],
                },
              },
              exam: {
                $push: {
                  $cond: [
                    { $eq: ["$scores.type", "exam"] },
                    "$scores.score",
                    "$$REMOVE",
                  ],
                },
              },
              homework: {
                $push: {
                  $cond: [
                    { $eq: ["$scores.type", "homework"] },
                    "$scores.score",
                    "$$REMOVE",
                  ],
                },
              },
            },
          },
          {
            $project: {
              learner_id: "$_id",
              _id: 0,
              avg: {
                $sum: [
                  { $multiply: [{ $avg: "$exam" }, 0.5] },
                  { $multiply: [{ $avg: "$quiz" }, 0.3] },
                  { $multiply: [{ $avg: "$homework" }, 0.2] },
                ],
              },
            },
          },
          {
            $match: {
              avg: { $gte: 70 },
            },
          },
        ])
        .toArray();
  
      const totalLearners = (await collection.distinct("learner_id")).length;
      if (totalLearners === 0) {
        return res.status(200).send({totalLearners: 0, learnersAbove70: 0, percentageAbove70: 0});
      }
  
      const learnersAbove70 = result.length;
      const percentageAbove70 = (learnersAbove70 / totalLearners) * 100;
  
      res.status(200).send({totalLearners, learnersAbove70, percentageAbove70});
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).send({ error: "Internal Server Error" });
    }
  });
    
// ================================================

// Create a GET route at /grades/stats/:id
// Within this route, mimic the above aggregation pipeline, but only for learners 
// within a class that has a class_id equal to the specified :id.
//eg: http://localhost:5050/grades_agg/stats/339

router.get("/stats/:id", async (req, res) => {
    try {
      const collection = await db.collection("grades");
      if (!collection) {
        return res.status(500).send({ error: "Database collection not found" });
      }
  
      const result = await collection
        .aggregate([
          {
            $unwind: "$scores",
          },
          {
            $group: {
              _id: "$learner_id",
              quiz: {
                $push: {
                  $cond: [
                    { $eq: ["$scores.type", "quiz"] },
                    "$scores.score",
                    "$$REMOVE",
                  ],
                },
              },
              exam: {
                $push: {
                  $cond: [
                    { $eq: ["$scores.type", "exam"] },
                    "$scores.score",
                    "$$REMOVE",
                  ],
                },
              },
              homework: {
                $push: {
                  $cond: [
                    { $eq: ["$scores.type", "homework"] },
                    "$scores.score",
                    "$$REMOVE",
                  ],
                },
              },
            },
          },
          {
            $project: {
              learner_id: "$_id",
              _id: 0,
              avg: {
                $sum: [
                  { $multiply: [{ $avg: "$exam" }, 0.5] },
                  { $multiply: [{ $avg: "$quiz" }, 0.3] },
                  { $multiply: [{ $avg: "$homework" }, 0.2] },
                ],
              },
            },
          },
          {
            $match: {
                class_id: Number(req.params.id)
            },
          },
        ])
        .toArray();
  
      const totalLearners = (await collection.distinct("learner_id")).length;
      if (totalLearners === 0) {
        return res.status(200).send({totalLearners: 0, learnersAbove70: 0, percentageAbove70: 0});
      }
  
      const learnersAbove70 = result.length;
      const percentageAbove70 = (learnersAbove70 / totalLearners) * 100;
  
      res.status(200).send({totalLearners, learnersAbove70, percentageAbove70});
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).send({ error: "Internal Server Error" });
    }
  });



//===============================================================


// localhost:5050/grades/

//Create a single-field index on class_id.
// Create a single-field index on learner_id.
// Create a compound index on learner_id and class_id, in that order, both ascending.

async function createIndexes(){
    const collection = await db.collection("grades");
    await collection.createIndex({ class_id: 1 });
    await collection.createIndex({ learner_id: 1 });
    await collection.createIndex({ learner_id: 1, class_id: 1 });
}
createIndexes();



export default router;
