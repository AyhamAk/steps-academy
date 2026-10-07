-- A tip can point at a YouTube video; the app shows it as a video card.
ALTER TABLE "Tip" ADD COLUMN "youtubeUrl" TEXT;
