-- Seed history for 2026-02-02: task given that day, your response, song recommended, and photo (cat).
-- Uses the first auth user. For the document photo to show, upload the cat image to Storage:
--   Bucket: document-photos
--   Path: <your-user-id>/2026-02-02/cat.png
-- (e.g. copy public/resources/cat-static.png there via Supabase Dashboard or run a one-off upload script.)

DO $$
DECLARE
  uid uuid;
BEGIN
  SELECT id INTO uid FROM auth.users LIMIT 1;
  IF uid IS NULL THEN
    RAISE NOTICE 'No auth user found; seed skipped.';
    RETURN;
  END IF;

  -- Daily prompt: task for the day + what you submitted
  INSERT INTO public.task_completions (user_id, task_id, date, notes, metadata)
  VALUES (
    uid,
    'daily_prompt',
    '2026-02-02',
    'I went for a walk and found a purple flower, a purple car, and a purple mailbox.',
    NULL
  )
  ON CONFLICT (user_id, task_id, date) DO UPDATE SET
    notes = EXCLUDED.notes,
    metadata = EXCLUDED.metadata;

  -- New song: song recommended that day
  INSERT INTO public.task_completions (user_id, task_id, date, notes, metadata)
  VALUES (
    uid,
    'new_song',
    '2026-02-02',
    NULL,
    '{"songTitle": "When I''m Small", "songArtist": "Phantogram"}'::jsonb
  )
  ON CONFLICT (user_id, task_id, date) DO UPDATE SET
    notes = EXCLUDED.notes,
    metadata = EXCLUDED.metadata;

  -- Document: photo you uploaded (cat image at user_id/2026-02-02/cat.png)
  INSERT INTO public.task_completions (user_id, task_id, date, notes, metadata)
  VALUES (
    uid,
    'document',
    '2026-02-02',
    NULL,
    jsonb_build_object('photoPath', uid::text || '/2026-02-02/cat.png')
  )
  ON CONFLICT (user_id, task_id, date) DO UPDATE SET
    notes = EXCLUDED.notes,
    metadata = EXCLUDED.metadata;

  -- Day snapshot so streak and points show in history
  INSERT INTO public.day_snapshots (user_id, date, points_snapshot, streak_snapshot)
  VALUES (uid, '2026-02-02', 20, 1)
  ON CONFLICT (user_id, date) DO UPDATE SET
    points_snapshot = EXCLUDED.points_snapshot,
    streak_snapshot = EXCLUDED.streak_snapshot;
END $$;
