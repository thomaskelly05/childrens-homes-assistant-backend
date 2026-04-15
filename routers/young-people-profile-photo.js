import express from "express";
import multer from "multer";
import sharp from "sharp";
import fs from "fs/promises";
import path from "path";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Only JPG, PNG and WebP images are allowed."));
    }
    cb(null, true);
  },
});

function getUploadsDir() {
  return path.join(process.cwd(), "public", "assets", "uploads", "young_people");
}

function publicPhotoUrl(youngPersonId, filename) {
  return `/assets/uploads/young_people/${youngPersonId}/${filename}`;
}

/**
 * Replace with your own DB access layer.
 * These are example helpers.
 */
async function getYoungPersonById(db, id) {
  const result = await db.query(
    `
      SELECT id, profile_photo_path, profile_photo_url
      FROM young_people
      WHERE id = $1
      LIMIT 1
    `,
    [id]
  );
  return result.rows[0] || null;
}

async function updateYoungPersonPhoto(db, id, payload) {
  const result = await db.query(
    `
      UPDATE young_people
      SET
        profile_photo_path = $2,
        profile_photo_url = $3,
        profile_photo_updated_at = NOW(),
        profile_photo_uploaded_by = $4
      WHERE id = $1
      RETURNING id, profile_photo_url, profile_photo_updated_at
    `,
    [id, payload.profile_photo_path, payload.profile_photo_url, payload.uploaded_by || null]
  );

  return result.rows[0] || null;
}

async function clearYoungPersonPhoto(db, id) {
  const result = await db.query(
    `
      UPDATE young_people
      SET
        profile_photo_path = NULL,
        profile_photo_url = NULL,
        profile_photo_updated_at = NOW()
      WHERE id = $1
      RETURNING id, profile_photo_url, profile_photo_updated_at
    `,
    [id]
  );

  return result.rows[0] || null;
}

router.post("/young-people/:id/profile-photo", upload.single("photo"), async (req, res) => {
  try {
    const db = req.app.locals.db;
    const youngPersonId = Number(req.params.id);

    if (!youngPersonId) {
      return res.status(400).json({ error: "Invalid young person ID." });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No photo uploaded." });
    }

    const youngPerson = await getYoungPersonById(db, youngPersonId);
    if (!youngPerson) {
      return res.status(404).json({ error: "Young person not found." });
    }

    const uploadsDir = getUploadsDir();
    const personDir = path.join(uploadsDir, String(youngPersonId));
    await fs.mkdir(personDir, { recursive: true });

    const filename = `profile-${Date.now()}.webp`;
    const absolutePath = path.join(personDir, filename);
    const relativePath = path.join("young_people", String(youngPersonId), filename).replaceAll("\\", "/");
    const photoUrl = publicPhotoUrl(youngPersonId, filename);

    await sharp(req.file.buffer)
      .rotate()
      .resize(512, 512, {
        fit: "cover",
        position: "centre",
      })
      .webp({ quality: 82 })
      .toFile(absolutePath);

    if (youngPerson.profile_photo_path) {
      const oldAbsolutePath = path.join(uploadsDir, youngPerson.profile_photo_path);
      await fs.unlink(oldAbsolutePath).catch(() => {});
    }

    const updated = await updateYoungPersonPhoto(db, youngPersonId, {
      profile_photo_path: relativePath,
      profile_photo_url: photoUrl,
      uploaded_by: req.user?.id || null,
    });

    return res.json({
      success: true,
      profile_photo_url: updated?.profile_photo_url || photoUrl,
      profile_photo_updated_at: updated?.profile_photo_updated_at || null,
    });
  } catch (error) {
    console.error("[profile-photo] upload failed", error);
    return res.status(500).json({
      error: error.message || "Failed to upload profile photo.",
    });
  }
});

router.delete("/young-people/:id/profile-photo", async (req, res) => {
  try {
    const db = req.app.locals.db;
    const youngPersonId = Number(req.params.id);

    if (!youngPersonId) {
      return res.status(400).json({ error: "Invalid young person ID." });
    }

    const youngPerson = await getYoungPersonById(db, youngPersonId);
    if (!youngPerson) {
      return res.status(404).json({ error: "Young person not found." });
    }

    const uploadsDir = getUploadsDir();

    if (youngPerson.profile_photo_path) {
      const oldAbsolutePath = path.join(uploadsDir, youngPerson.profile_photo_path);
      await fs.unlink(oldAbsolutePath).catch(() => {});
    }

    const updated = await clearYoungPersonPhoto(db, youngPersonId);

    return res.json({
      success: true,
      profile_photo_url: updated?.profile_photo_url || null,
      profile_photo_updated_at: updated?.profile_photo_updated_at || null,
    });
  } catch (error) {
    console.error("[profile-photo] delete failed", error);
    return res.status(500).json({
      error: error.message || "Failed to remove profile photo.",
    });
  }
});

export default router;
