-- Classroom: assignment file-type rules + teacher context materials (LMS-style).
-- Apply after classroom_submissions_grading_and_files.sql.

-- ---------------------------------------------------------------------------
-- Assignment settings
-- ---------------------------------------------------------------------------
ALTER TABLE public.classroom_assignments
  ADD COLUMN IF NOT EXISTS allow_file_upload boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS require_file boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS allowed_extensions text[];

COMMENT ON COLUMN public.classroom_assignments.allow_file_upload IS
  'When false, students submit text only.';
COMMENT ON COLUMN public.classroom_assignments.require_file IS
  'When true (and allow_file_upload), students must attach a file.';
COMMENT ON COLUMN public.classroom_assignments.allowed_extensions IS
  'Lowercase extensions without dots, e.g. {pdf,docx}. NULL = any allowed classroom type.';

-- ---------------------------------------------------------------------------
-- Teacher-uploaded context files for an assignment
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.classroom_assignment_materials (
  material_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.classroom_assignments(assignment_id) ON DELETE CASCADE,
  file_path text NOT NULL,
  file_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_classroom_assignment_materials_assignment
  ON public.classroom_assignment_materials(assignment_id);

ALTER TABLE public.classroom_assignment_materials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "classroom_assignment_materials_exec_all" ON public.classroom_assignment_materials;
CREATE POLICY "classroom_assignment_materials_exec_all"
  ON public.classroom_assignment_materials FOR ALL TO authenticated
  USING (public.is_span_exec()) WITH CHECK (public.is_span_exec());

DROP POLICY IF EXISTS "classroom_assignment_materials_teacher_all" ON public.classroom_assignment_materials;
CREATE POLICY "classroom_assignment_materials_teacher_all"
  ON public.classroom_assignment_materials FOR ALL TO authenticated
  USING (public.classroom_teacher_owns_assignment(assignment_id))
  WITH CHECK (public.classroom_teacher_owns_assignment(assignment_id));

DROP POLICY IF EXISTS "classroom_assignment_materials_student_select" ON public.classroom_assignment_materials;
CREATE POLICY "classroom_assignment_materials_student_select"
  ON public.classroom_assignment_materials FOR SELECT TO authenticated
  USING (
    assignment_id IN (
      SELECT a.assignment_id
      FROM public.classroom_assignments a
      WHERE public.classroom_student_enrolled_in_class(a.class_id)
    )
  );

-- ---------------------------------------------------------------------------
-- Storage: teachers upload materials under …/_materials/…
-- Students may read materials for classes they are enrolled in.
-- Path: {class_id}/{assignment_id}/_materials/{filename}
--        {class_id}/{assignment_id}/{student_id}/{filename}
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "classroom_submissions_storage_student_select" ON storage.objects;
CREATE POLICY "classroom_submissions_storage_student_select"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'classroom-submissions'
  AND (
    (storage.foldername(name))[3] = public.current_classroom_student_id()::text
    OR (
      (storage.foldername(name))[3] = '_materials'
      AND public.classroom_student_enrolled_in_class(((storage.foldername(name))[1])::uuid)
    )
  )
);

DROP POLICY IF EXISTS "classroom_submissions_storage_teacher_write_materials" ON storage.objects;
CREATE POLICY "classroom_submissions_storage_teacher_write_materials"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'classroom-submissions'
  AND (storage.foldername(name))[3] = '_materials'
  AND public.classroom_teacher_owns_class(((storage.foldername(name))[1])::uuid)
);

DROP POLICY IF EXISTS "classroom_submissions_storage_teacher_update_materials" ON storage.objects;
CREATE POLICY "classroom_submissions_storage_teacher_update_materials"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'classroom-submissions'
  AND (storage.foldername(name))[3] = '_materials'
  AND public.classroom_teacher_owns_class(((storage.foldername(name))[1])::uuid)
)
WITH CHECK (
  bucket_id = 'classroom-submissions'
  AND (storage.foldername(name))[3] = '_materials'
  AND public.classroom_teacher_owns_class(((storage.foldername(name))[1])::uuid)
);

DROP POLICY IF EXISTS "classroom_submissions_storage_teacher_delete_materials" ON storage.objects;
CREATE POLICY "classroom_submissions_storage_teacher_delete_materials"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'classroom-submissions'
  AND (storage.foldername(name))[3] = '_materials'
  AND public.classroom_teacher_owns_class(((storage.foldername(name))[1])::uuid)
);

-- Teachers already have SELECT on whole class folder via classroom_teacher_owns_class.
