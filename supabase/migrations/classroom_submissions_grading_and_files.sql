-- Classroom Phase 2: submission grading/feedback + private file storage.
-- Apply after create_classroom_tables.sql + fix_classroom_rls_recursion.sql.

-- ---------------------------------------------------------------------------
-- Submissions: grade / feedback
-- ---------------------------------------------------------------------------
ALTER TABLE public.classroom_submissions
  ADD COLUMN IF NOT EXISTS grade text,
  ADD COLUMN IF NOT EXISTS feedback text,
  ADD COLUMN IF NOT EXISTS graded_at timestamptz,
  ADD COLUMN IF NOT EXISTS graded_by uuid REFERENCES public.classroom_teachers(teacher_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS file_name text;

COMMENT ON COLUMN public.classroom_submissions.grade IS 'Teacher-assigned grade (free text, e.g. A / 92 / Complete).';
COMMENT ON COLUMN public.classroom_submissions.feedback IS 'Teacher written feedback for the student.';
COMMENT ON COLUMN public.classroom_submissions.file_path IS 'Path in classroom-submissions storage bucket.';
COMMENT ON COLUMN public.classroom_submissions.file_name IS 'Original uploaded file name for display.';

-- Teachers can update submissions they own (for grading); students keep their own ALL.
DROP POLICY IF EXISTS "classroom_submissions_teacher_update" ON public.classroom_submissions;
CREATE POLICY "classroom_submissions_teacher_update"
  ON public.classroom_submissions FOR UPDATE TO authenticated
  USING (public.classroom_teacher_owns_assignment(assignment_id))
  WITH CHECK (public.classroom_teacher_owns_assignment(assignment_id));

-- Prevent students from forging grade/feedback on insert/update.
CREATE OR REPLACE FUNCTION public.classroom_submissions_protect_grades()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_teacher_id uuid := public.current_classroom_teacher_id();
BEGIN
  -- Teachers (and exec via separate path) may set grades.
  IF v_teacher_id IS NOT NULL AND public.classroom_teacher_owns_assignment(NEW.assignment_id) THEN
    RETURN NEW;
  END IF;

  IF public.is_span_exec() THEN
    RETURN NEW;
  END IF;

  -- Students / others: preserve existing grade fields; clear on insert.
  IF TG_OP = 'INSERT' THEN
    NEW.grade := NULL;
    NEW.feedback := NULL;
    NEW.graded_at := NULL;
    NEW.graded_by := NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.grade := OLD.grade;
    NEW.feedback := OLD.feedback;
    NEW.graded_at := OLD.graded_at;
    NEW.graded_by := OLD.graded_by;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_classroom_submissions_protect_grades ON public.classroom_submissions;
CREATE TRIGGER trg_classroom_submissions_protect_grades
  BEFORE INSERT OR UPDATE ON public.classroom_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.classroom_submissions_protect_grades();

/** Teacher: set grade + feedback on a submission. */
CREATE OR REPLACE FUNCTION public.classroom_grade_submission(
  p_submission_id uuid,
  p_grade text,
  p_feedback text
)
RETURNS public.classroom_submissions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_teacher_id uuid;
  v_row public.classroom_submissions;
BEGIN
  v_teacher_id := public.current_classroom_teacher_id();
  IF v_teacher_id IS NULL THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_row
  FROM public.classroom_submissions
  WHERE submission_id = p_submission_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002';
  END IF;

  IF NOT public.classroom_teacher_owns_assignment(v_row.assignment_id) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  UPDATE public.classroom_submissions
  SET
    grade = nullif(trim(p_grade), ''),
    feedback = nullif(trim(p_feedback), ''),
    graded_at = now(),
    graded_by = v_teacher_id
  WHERE submission_id = p_submission_id
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.classroom_grade_submission(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.classroom_grade_submission(uuid, text, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- Storage: private classroom submission files
-- Path: {class_id}/{assignment_id}/{student_id}/{filename}
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'classroom-submissions',
  'classroom-submissions',
  false,
  10485760,
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "classroom_submissions_storage_student_select" ON storage.objects;
CREATE POLICY "classroom_submissions_storage_student_select"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'classroom-submissions'
  AND (storage.foldername(name))[3] = public.current_classroom_student_id()::text
);

DROP POLICY IF EXISTS "classroom_submissions_storage_student_insert" ON storage.objects;
CREATE POLICY "classroom_submissions_storage_student_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'classroom-submissions'
  AND (storage.foldername(name))[3] = public.current_classroom_student_id()::text
  AND public.classroom_student_enrolled_in_class(((storage.foldername(name))[1])::uuid)
);

DROP POLICY IF EXISTS "classroom_submissions_storage_student_update" ON storage.objects;
CREATE POLICY "classroom_submissions_storage_student_update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'classroom-submissions'
  AND (storage.foldername(name))[3] = public.current_classroom_student_id()::text
)
WITH CHECK (
  bucket_id = 'classroom-submissions'
  AND (storage.foldername(name))[3] = public.current_classroom_student_id()::text
);

DROP POLICY IF EXISTS "classroom_submissions_storage_student_delete" ON storage.objects;
CREATE POLICY "classroom_submissions_storage_student_delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'classroom-submissions'
  AND (storage.foldername(name))[3] = public.current_classroom_student_id()::text
);

DROP POLICY IF EXISTS "classroom_submissions_storage_teacher_select" ON storage.objects;
CREATE POLICY "classroom_submissions_storage_teacher_select"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'classroom-submissions'
  AND public.classroom_teacher_owns_class(((storage.foldername(name))[1])::uuid)
);

DROP POLICY IF EXISTS "classroom_submissions_storage_exec_all" ON storage.objects;
CREATE POLICY "classroom_submissions_storage_exec_all"
ON storage.objects FOR ALL TO authenticated
USING (
  bucket_id = 'classroom-submissions'
  AND public.is_span_exec()
)
WITH CHECK (
  bucket_id = 'classroom-submissions'
  AND public.is_span_exec()
);
