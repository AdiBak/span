-- Fix 42P17 infinite recursion on classroom_classes:
-- student SELECT policy queried enrollments; enrollments teacher policy queried classes again.
-- Apply after create_classroom_tables.sql (safe to re-run).

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

GRANT EXECUTE ON FUNCTION public.classroom_teacher_owns_class(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.classroom_student_enrolled_in_class(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.classroom_teacher_can_view_student(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.classroom_teacher_owns_assignment(uuid) TO authenticated;

DROP POLICY IF EXISTS "classroom_classes_student_select" ON public.classroom_classes;
CREATE POLICY "classroom_classes_student_select"
  ON public.classroom_classes FOR SELECT TO authenticated
  USING (public.classroom_student_enrolled_in_class(class_id));

DROP POLICY IF EXISTS "classroom_students_teacher_select_roster" ON public.classroom_students;
CREATE POLICY "classroom_students_teacher_select_roster"
  ON public.classroom_students FOR SELECT TO authenticated
  USING (public.classroom_teacher_can_view_student(student_id));

DROP POLICY IF EXISTS "classroom_enrollments_teacher_select" ON public.classroom_enrollments;
CREATE POLICY "classroom_enrollments_teacher_select"
  ON public.classroom_enrollments FOR SELECT TO authenticated
  USING (public.classroom_teacher_owns_class(class_id));

DROP POLICY IF EXISTS "classroom_assignments_teacher_all" ON public.classroom_assignments;
CREATE POLICY "classroom_assignments_teacher_all"
  ON public.classroom_assignments FOR ALL TO authenticated
  USING (public.classroom_teacher_owns_class(class_id))
  WITH CHECK (public.classroom_teacher_owns_class(class_id));

DROP POLICY IF EXISTS "classroom_assignments_student_select" ON public.classroom_assignments;
CREATE POLICY "classroom_assignments_student_select"
  ON public.classroom_assignments FOR SELECT TO authenticated
  USING (public.classroom_student_enrolled_in_class(class_id));

DROP POLICY IF EXISTS "classroom_submissions_teacher_select" ON public.classroom_submissions;
CREATE POLICY "classroom_submissions_teacher_select"
  ON public.classroom_submissions FOR SELECT TO authenticated
  USING (public.classroom_teacher_owns_assignment(assignment_id));

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
