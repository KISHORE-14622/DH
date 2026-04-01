import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { createClient } from "@supabase/supabase-js";

let supabaseClient = null;

const getSupabaseClient = () => {
  if (supabaseClient) {
    return supabaseClient;
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }

  supabaseClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  return supabaseClient;
};

const safeExtension = (originalName, mimeType) => {
  const byName = path.extname(originalName || "").toLowerCase();
  if ([".jpg", ".jpeg", ".png", ".webp"].includes(byName)) {
    return byName;
  }

  if (mimeType === "image/png") return ".png";
  if (mimeType === "image/webp") return ".webp";
  return ".jpg";
};

export const storeWinnerProof = async (file) => {
  const extension = safeExtension(file.originalname, file.mimetype);
  const objectName = `winner-proofs/${Date.now()}-${randomUUID()}${extension}`;

  const supabase = getSupabaseClient();
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "winner-proofs";

  if (supabase) {
    const { error } = await supabase.storage.from(bucket).upload(objectName, file.buffer, {
      contentType: file.mimetype,
      upsert: false
    });

    if (!error) {
      const { data } = supabase.storage.from(bucket).getPublicUrl(objectName);
      return {
        proofUrl: data.publicUrl,
        storageMode: "supabase"
      };
    }
  }

  await mkdir("uploads", { recursive: true });
  const localName = `${Date.now()}-${randomUUID()}${extension}`;
  await writeFile(path.join("uploads", localName), file.buffer);

  return {
    proofUrl: `/uploads/${localName}`,
    storageMode: "local"
  };
};
