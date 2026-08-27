-- Classroom module (Phase 1): schools, teachers, classes, students, assignments.
-- Separate from chapter members; classroom users auth via Supabase only.

-- ---------------------------------------------------------------------------
-- Helpers (no classroom table dependencies)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_span_exec()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.members m
    WHERE m.user_id = auth.uid()
      AND (m.volunteer = true OR m.volunteer = 'true')
      AND (m.applications = true OR m.applications = 'true')
      AND (m.bills = true OR m.bills = 'true')
      AND (m.registration = true OR m.registration = 'true')
  );
$$;

REVOKE ALL ON FUNCTION public.is_span_exec() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_span_exec() TO authenticated;

CREATE OR REPLACE FUNCTION public.generate_classroom_join_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  chars text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  result text := '';
  i int;
BEGIN
  FOR i IN 1..4 LOOP
    result := result || substr(chars, 1 + floor(random() * length(chars))::int, 1);
  END LOOP;
  RETURN result || '-' || (
    SELECT string_agg(substr(chars, 1 + floor(random() * length(chars))::int, 1), '')
    FROM generate_series(1, 4)
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.classroom_schools (
  school_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  city text,
  state text,
  contact_email text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.classroom_teachers (
  teacher_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  school_id uuid NOT NULL REFERENCES public.classroom_schools(school_id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_classroom_teachers_school ON public.classroom_teachers(school_id);
CREATE INDEX IF NOT EXISTS idx_classroom_teachers_email ON public.classroom_teachers(lower(email));

CREATE TABLE IF NOT EXISTS public.classroom_classes (
  class_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.classroom_schools(school_id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES public.classroom_teachers(teacher_id) ON DELETE CASCADE,
  name text NOT NULL,
  term text,
  join_code text NOT NULL UNIQUE,
  archived boolean NOT NULL DEFAULT false,
  features jsonb NOT NULL DEFAULT '{"assignments":true,"legiscan":true,"policy_toolkit":true}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_classroom_classes_teacher ON public.classroom_classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_classroom_classes_join_code ON public.classroom_classes(upper(join_code));

CREATE TABLE IF NOT EXISTS public.classroom_students (
  student_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.classroom_enrollments (
  enrollment_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.classroom_classes(class_id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.classroom_students(student_id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (class_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_classroom_enrollments_class ON public.classroom_enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_classroom_enrollments_student ON public.classroom_enrollments(student_id);

CREATE TABLE IF NOT EXISTS public.classroom_assignments (
  assignment_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.classroom_classes(class_id) ON DELETE CASCADE,
  title text NOT NULL,
  instructions text,
  due_at date,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_classroom_assignments_class ON public.classroom_assignments(class_id);

CREATE TABLE IF NOT EXISTS public.classroom_submissions (
  submission_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.classroom_assignments(assignment_id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.classroom_students(student_id) ON DELETE CASCADE,
  body text,
  file_path text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assignment_id, student_id)
);

-- ---------------------------------------------------------------------------
-- Helpers (require classroom tables)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_classroom_teacher_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT t.teacher_id
  FROM public.classroom_teachers t
  WHERE t.user_id = auth.uid()
    AND COALESCE(t.active, true)
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.current_classroom_teacher_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_classroom_teacher_id() TO authenticated;

CREATE OR REPLACE FUNCTION public.current_classroom_student_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT s.student_id
  FROM public.classroom_students s
  WHERE s.user_id = auth.uid()
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.current_classroom_student_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_classroom_student_id() TO authenticated;

-- RLS-safe membership checks (avoid 42P17 cycles between classes ↔ enrollments).
CREATE OR REPLACE FUNCTION public.classroom_teacher_owns_class(p_class_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.classroom_classes c
    WHERE c.class_id = p_class_id
      AND c.teacher_id = public.current_classroom_teacher_id()
  );
$$;

REVOKE ALL ON FUNCTION public.classroom_teacher_owns_class(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.classroom_teacher_owns_class(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.classroom_student_enrolled_in_class(p_class_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.classroom_enrollments e
    WHERE e.class_id = p_class_id
      AND e.student_id = public.current_classroom_student_id()
  );
$$;

REVOKE ALL ON FUNCTION public.classroom_student_enrolled_in_class(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.classroom_student_enrolled_in_class(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.classroom_teacher_can_view_student(p_student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.classroom_enrollments e
    INNER JOIN public.classroom_classes c ON c.class_id = e.class_id
    WHERE e.student_id = p_student_id
      AND c.teacher_id = public.current_classroom_teacher_id()
  );
$$;

REVOKE ALL ON FUNCTION public.classroom_teacher_can_view_student(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.classroom_teacher_can_view_student(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.classroom_teacher_owns_assignment(p_assignment_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.classroom_assignments a
    INNER JOIN public.classroom_classes c ON c.class_id = a.class_id
    WHERE a.assignment_id = p_assignment_id
      AND c.teacher_id = public.current_classroom_teacher_id()
  );
$$;

REVOKE ALL ON FUNCTION public.classroom_teacher_owns_assignment(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.classroom_teacher_owns_assignment(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.classroom_schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_submissions ENABLE ROW LEVEL SECURITY;

-- Schools: exec all; teachers read own school
CREATE POLICY "classroom_schools_exec_all"
  ON public.classroom_schools FOR ALL TO authenticated
  USING (public.is_span_exec()) WITH CHECK (public.is_span_exec());

CREATE POLICY "classroom_schools_teacher_select"
  ON public.classroom_schools FOR SELECT TO authenticated
  USING (
    school_id IN (
      SELECT t.school_id FROM public.classroom_teachers t
      WHERE t.user_id = auth.uid() AND COALESCE(t.active, true)
    )
  );

-- Teachers: exec all; teacher read/update self
CREATE POLICY "classroom_teachers_exec_all"
  ON public.classroom_teachers FOR ALL TO authenticated
  USING (public.is_span_exec()) WITH CHECK (public.is_span_exec());

CREATE POLICY "classroom_teachers_self_select"
  ON public.classroom_teachers FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Classes: exec all; teacher CRUD own; student read enrolled
CREATE POLICY "classroom_classes_exec_all"
  ON public.classroom_classes FOR ALL TO authenticated
  USING (public.is_span_exec()) WITH CHECK (public.is_span_exec());

CREATE POLICY "classroom_classes_teacher_all"
  ON public.classroom_classes FOR ALL TO authenticated
  USING (teacher_id = public.current_classroom_teacher_id())
  WITH CHECK (teacher_id = public.current_classroom_teacher_id());

CREATE POLICY "classroom_classes_student_select"
  ON public.classroom_classes FOR SELECT TO authenticated
  USING (public.classroom_student_enrolled_in_class(class_id));

-- Students: exec all; self select/update; teachers see roster in their classes
CREATE POLICY "classroom_students_exec_all"
  ON public.classroom_students FOR ALL TO authenticated
  USING (public.is_span_exec()) WITH CHECK (public.is_span_exec());

CREATE POLICY "classroom_students_self_select"
  ON public.classroom_students FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "classroom_students_self_update"
  ON public.classroom_students FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "classroom_students_teacher_select_roster"
  ON public.classroom_students FOR SELECT TO authenticated
  USING (public.classroom_teacher_can_view_student(student_id));

-- Enrollments
CREATE POLICY "classroom_enrollments_exec_all"
  ON public.classroom_enrollments FOR ALL TO authenticated
  USING (public.is_span_exec()) WITH CHECK (public.is_span_exec());

CREATE POLICY "classroom_enrollments_teacher_select"
  ON public.classroom_enrollments FOR SELECT TO authenticated
  USING (public.classroom_teacher_owns_class(class_id));

CREATE POLICY "classroom_enrollments_student_select"
  ON public.classroom_enrollments FOR SELECT TO authenticated
  USING (student_id = public.current_classroom_student_id());

-- Assignments
CREATE POLICY "classroom_assignments_exec_all"
  ON public.classroom_assignments FOR ALL TO authenticated
  USING (public.is_span_exec()) WITH CHECK (public.is_span_exec());

CREATE POLICY "classroom_assignments_teacher_all"
  ON public.classroom_assignments FOR ALL TO authenticated
  USING (public.classroom_teacher_owns_class(class_id))
  WITH CHECK (public.classroom_teacher_owns_class(class_id));

CREATE POLICY "classroom_assignments_student_select"
  ON public.classroom_assignments FOR SELECT TO authenticated
  USING (public.classroom_student_enrolled_in_class(class_id));

-- Submissions
CREATE POLICY "classroom_submissions_exec_all"
  ON public.classroom_submissions FOR ALL TO authenticated
  USING (public.is_span_exec()) WITH CHECK (public.is_span_exec());

CREATE POLICY "classroom_submissions_teacher_select"
  ON public.classroom_submissions FOR SELECT TO authenticated
  USING (public.classroom_teacher_owns_assignment(assignment_id));

CREATE POLICY "classroom_submissions_student_all"
  ON public.classroom_submissions FOR ALL TO authenticated
  USING (student_id = public.current_classroom_student_id())
  WITH CHECK (student_id = public.current_classroom_student_id());

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------

/** Public: validate join code (safe fields only). */
CREATE OR REPLACE FUNCTION public.validate_classroom_join_code(p_code text)
RETURNS TABLE (
  class_id uuid,
  class_name text,
  term text,
  school_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT
    c.class_id,
    c.name,
    c.term,
    s.name
  FROM public.classroom_classes c
  INNER JOIN public.classroom_schools s ON s.school_id = c.school_id
  WHERE upper(trim(c.join_code)) = upper(trim(p_code))
    AND COALESCE(c.archived, false) = false
    AND COALESCE(s.active, true);
$$;

REVOKE ALL ON FUNCTION public.validate_classroom_join_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_classroom_join_code(text) TO anon;
GRANT EXECUTE ON FUNCTION public.validate_classroom_join_code(text) TO authenticated;

/** After sign-up/sign-in: create student profile + enroll in class. */
CREATE OR REPLACE FUNCTION public.join_classroom_with_code(
  p_code text,
  p_first_name text,
  p_last_name text,
  p_phone text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_class_id uuid;
  v_student_id uuid;
  v_email text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT c.class_id INTO v_class_id
  FROM public.classroom_classes c
  INNER JOIN public.classroom_schools s ON s.school_id = c.school_id
  WHERE upper(trim(c.join_code)) = upper(trim(p_code))
    AND COALESCE(c.archived, false) = false
    AND COALESCE(s.active, true)
  LIMIT 1;

  IF v_class_id IS NULL THEN
    RAISE EXCEPTION 'invalid_join_code' USING ERRCODE = '22023';
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();

  SELECT student_id INTO v_student_id
  FROM public.classroom_students
  WHERE user_id = auth.uid();

  IF v_student_id IS NULL THEN
    INSERT INTO public.classroom_students (user_id, first_name, last_name, email, phone)
    VALUES (
      auth.uid(),
      trim(p_first_name),
      trim(p_last_name),
      coalesce(v_email, ''),
      trim(p_phone)
    )
    RETURNING student_id INTO v_student_id;
  ELSE
    UPDATE public.classroom_students
    SET
      first_name = trim(p_first_name),
      last_name = trim(p_last_name),
      phone = trim(p_phone)
    WHERE student_id = v_student_id;
  END IF;

  INSERT INTO public.classroom_enrollments (class_id, student_id)
  VALUES (v_class_id, v_student_id)
  ON CONFLICT (class_id, student_id) DO NOTHING;

  RETURN v_class_id;
END;
$$;

REVOKE ALL ON FUNCTION public.join_classroom_with_code(text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.join_classroom_with_code(text, text, text, text) TO authenticated;

/** Exec: link teacher row to auth user by email (for dummy account setup). */
CREATE OR REPLACE FUNCTION public.classroom_link_teacher(p_teacher_id uuid, p_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  IF NOT public.is_span_exec() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT id INTO v_user_id
  FROM auth.users
  WHERE lower(trim(email)) = lower(trim(p_email))
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.classroom_teachers
  SET user_id = v_user_id, email = lower(trim(p_email))
  WHERE teacher_id = p_teacher_id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.classroom_link_teacher(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.classroom_link_teacher(uuid, text) TO authenticated;

/** Teacher: create class with unique join code. */
CREATE OR REPLACE FUNCTION public.classroom_create_class(
  p_name text,
  p_term text DEFAULT NULL
)
RETURNS public.classroom_classes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_teacher_id uuid;
  v_school_id uuid;
  v_code text;
  v_row public.classroom_classes;
  attempts int := 0;
BEGIN
  v_teacher_id := public.current_classroom_teacher_id();
  IF v_teacher_id IS NULL THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT school_id INTO v_school_id
  FROM public.classroom_teachers WHERE teacher_id = v_teacher_id;

  LOOP
    attempts := attempts + 1;
    v_code := public.generate_classroom_join_code();
    BEGIN
      INSERT INTO public.classroom_classes (school_id, teacher_id, name, term, join_code)
      VALUES (v_school_id, v_teacher_id, trim(p_name), nullif(trim(p_term), ''), v_code)
      RETURNING * INTO v_row;
      RETURN v_row;
    EXCEPTION WHEN unique_violation THEN
      IF attempts >= 8 THEN
        RAISE;
      END IF;
    END;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.classroom_create_class(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.classroom_create_class(text, text) TO authenticated;

/** Resolve role for dashboard routing. */
CREATE OR REPLACE FUNCTION public.get_classroom_session_role()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_result jsonb := '{}'::jsonb;
  v_teacher record;
  v_student record;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN v_result;
  END IF;

  SELECT teacher_id, school_id, first_name, last_name, email
  INTO v_teacher
  FROM public.classroom_teachers
  WHERE user_id = auth.uid() AND COALESCE(active, true)
  LIMIT 1;

  IF FOUND THEN
    v_result := v_result || jsonb_build_object(
      'role', 'teacher',
      'teacher_id', v_teacher.teacher_id,
      'school_id', v_teacher.school_id,
      'first_name', v_teacher.first_name,
      'last_name', v_teacher.last_name,
      'email', v_teacher.email
    );
    RETURN v_result;
  END IF;

  SELECT student_id, first_name, last_name, email, phone
  INTO v_student
  FROM public.classroom_students
  WHERE user_id = auth.uid()
  LIMIT 1;

  IF FOUND THEN
    v_result := v_result || jsonb_build_object(
      'role', 'student',
      'student_id', v_student.student_id,
      'first_name', v_student.first_name,
      'last_name', v_student.last_name,
      'email', v_student.email,
      'phone', v_student.phone
    );
  END IF;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_classroom_session_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_classroom_session_role() TO authenticated;

COMMENT ON TABLE public.classroom_schools IS 'Operational schools for SPAN Classroom (separate from homepage carousel schools).';
