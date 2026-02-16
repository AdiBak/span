-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.agent_proposal_reviews (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  user_id uuid,
  proposal_text text NOT NULL,
  ai_score double precision,
  reasons jsonb,
  improvements jsonb,
  raw_ai_response jsonb,
  success boolean NOT NULL DEFAULT true,
  error_message text,
  bill_id bigint NOT NULL UNIQUE,
  CONSTRAINT agent_proposal_reviews_pkey PRIMARY KEY (id),
  CONSTRAINT agent_proposal_reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.members(member_id),
  CONSTRAINT agent_proposal_reviews_bill_id_fkey FOREIGN KEY (bill_id) REFERENCES public.bill_proposals(id)
);
CREATE TABLE public.applications (
  application_id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text NOT NULL,
  phone_number text NOT NULL,
  full_name text NOT NULL,
  grade text NOT NULL,
  school text NOT NULL,
  state text NOT NULL,
  hours_per_week text NOT NULL,
  additional_info text,
  referral_source text NOT NULL,
  submitted_at timestamp with time zone NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'under_review'::text, 'contacted'::text, 'accepted'::text, 'rejected'::text])),
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  notes text,
  linkedin_url text,
  instagram_url text,
  resume_file text,
  CONSTRAINT applications_pkey PRIMARY KEY (application_id),
  CONSTRAINT applications_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.members(member_id)
);
CREATE TABLE public.bill_proposals (
  id bigint NOT NULL,
  number text,
  state_code text,
  proposal_text text,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT bill_proposals_pkey PRIMARY KEY (id)
);
CREATE TABLE public.bills (
  state text NOT NULL,
  name text NOT NULL,
  position text CHECK ("position" = ANY (ARRAY['Support'::text, 'Oppose'::text, 'Support If Amended'::text, 'Propose'::text])),
  description text NOT NULL,
  bill_date date NOT NULL,
  legiscan_link text,
  bill_collaborators jsonb,
  bill_id integer NOT NULL DEFAULT nextval('bills_new_bill_id_seq'::regclass),
  status text DEFAULT 'approved'::text CHECK (status IS NULL OR (status = ANY (ARRAY['under_review'::text, 'approved'::text, 'modified'::text, 'rejected'::text]))),
  submitted_by uuid,
  submitted_at timestamp with time zone DEFAULT now(),
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  review_notes text,
  CONSTRAINT bills_pkey PRIMARY KEY (bill_id),
  CONSTRAINT bills_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES public.members(member_id),
  CONSTRAINT bills_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.members(member_id)
);
CREATE TABLE public.contact_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid,
  legislator_id uuid,
  contact_date date NOT NULL,
  method character varying NOT NULL,
  contacted_by uuid,
  outcome character varying,
  notes text,
  next_step_date date,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT contact_log_pkey PRIMARY KEY (id),
  CONSTRAINT contact_log_legislator_id_fkey FOREIGN KEY (legislator_id) REFERENCES public.legislators(id),
  CONSTRAINT contact_log_contacted_by_fkey FOREIGN KEY (contacted_by) REFERENCES public.members(id),
  CONSTRAINT contact_log_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id)
);
CREATE TABLE public.hr_reports (
  report_id uuid NOT NULL DEFAULT gen_random_uuid(),
  submitted_by uuid NOT NULL,
  nature_of_complaint text NOT NULL,
  regarding_member_id uuid,
  regarding_name text,
  date_occurred date NOT NULL,
  details text,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'reviewed'::text, 'resolved'::text, 'dismissed'::text])),
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  review_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT hr_reports_pkey PRIMARY KEY (report_id),
  CONSTRAINT hr_reports_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES public.members(member_id),
  CONSTRAINT hr_reports_regarding_member_id_fkey FOREIGN KEY (regarding_member_id) REFERENCES public.members(member_id),
  CONSTRAINT hr_reports_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.members(member_id)
);
CREATE TABLE public.legislator_recommendations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid,
  legislator_id uuid,
  similarity_score numeric,
  generated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT legislator_recommendations_pkey PRIMARY KEY (id),
  CONSTRAINT legislator_recommendations_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id),
  CONSTRAINT legislator_recommendations_legislator_id_fkey FOREIGN KEY (legislator_id) REFERENCES public.legislators(id)
);
CREATE TABLE public.legislators (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  external_id character varying UNIQUE,
  name character varying NOT NULL,
  state character varying NOT NULL,
  chamber character varying,
  party character varying,
  district character varying,
  committees jsonb,
  contact_email character varying,
  contact_phone character varying,
  bio_text text,
  embedding USER-DEFINED,
  active boolean DEFAULT true,
  CONSTRAINT legislators_pkey PRIMARY KEY (id)
);
CREATE TABLE public.member_requests (
  request_id uuid NOT NULL DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['leave'::text, 'extension'::text])),
  reason text NOT NULL,
  leave_start date,
  leave_end date,
  project_name text,
  requested_by_date date,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'declined'::text])),
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  review_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT member_requests_pkey PRIMARY KEY (request_id),
  CONSTRAINT member_requests_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.members(member_id),
  CONSTRAINT member_requests_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.members(member_id)
);
CREATE TABLE public.members (
  first_name text NOT NULL,
  last_name text NOT NULL,
  role text NOT NULL,
  active boolean,
  start_date date,
  dob date,
  school_name text,
  city text,
  state text,
  email text,
  phone bigint,
  linkedin text,
  instagram text,
  image text,
  notes text,
  end_date date,
  bio text,
  member_id uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  original_email text,
  user_id uuid,
  updated_at timestamp with time zone DEFAULT now(),
  registration_complete boolean DEFAULT false,
  volunteer boolean NOT NULL DEFAULT false,
  applications boolean NOT NULL DEFAULT false,
  bills boolean NOT NULL DEFAULT false,
  registration boolean NOT NULL DEFAULT false,
  id uuid UNIQUE,
  CONSTRAINT members_pkey PRIMARY KEY (member_id),
  CONSTRAINT members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.partners (
  partner_id uuid NOT NULL DEFAULT gen_random_uuid(),
  partner_name text NOT NULL,
  partner_logo text NOT NULL,
  website_url text,
  display_order integer DEFAULT 999,
  active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT partners_pkey PRIMARY KEY (partner_id)
);
CREATE TABLE public.project_members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid,
  member_id uuid,
  role character varying NOT NULL,
  joined_at timestamp without time zone DEFAULT now(),
  CONSTRAINT project_members_pkey PRIMARY KEY (id),
  CONSTRAINT project_members_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id),
  CONSTRAINT project_members_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.members(id)
);
CREATE TABLE public.projects (
  id uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  title character varying NOT NULL,
  description text NOT NULL,
  state character varying,
  goal text,
  status character varying DEFAULT 'Draft'::character varying,
  created_by uuid,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  embedding USER-DEFINED,
  CONSTRAINT projects_pkey PRIMARY KEY (id),
  CONSTRAINT projects_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.members(member_id)
);
CREATE TABLE public.qr_logins (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  token text NOT NULL UNIQUE,
  expires_at timestamp without time zone NOT NULL,
  CONSTRAINT qr_logins_pkey PRIMARY KEY (id),
  CONSTRAINT qr_logins_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.schools (
  school_image text,
  school_name text,
  display_order integer,
  school_id integer NOT NULL DEFAULT nextval('schools_school_id_seq'::regclass),
  active boolean DEFAULT true,
  CONSTRAINT schools_pkey PRIMARY KEY (school_id)
);
CREATE TABLE public.tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid,
  phase_id uuid,
  assigned_to uuid,
  title character varying NOT NULL,
  description text,
  status character varying DEFAULT 'To Do'::character varying,
  due_date date,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT tasks_pkey PRIMARY KEY (id),
  CONSTRAINT fk_tasks_projects FOREIGN KEY (project_id) REFERENCES public.projects(id),
  CONSTRAINT fk_tasks_phases FOREIGN KEY (phase_id) REFERENCES public.timeline_phases(id),
  CONSTRAINT fk_tasks_members FOREIGN KEY (assigned_to) REFERENCES public.members(id)
);
CREATE TABLE public.timeline_phases (
  id uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  project_id uuid,
  name character varying NOT NULL,
  description text,
  start_date date,
  end_date date,
  phase_order integer NOT NULL,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT timeline_phases_pkey PRIMARY KEY (id),
  CONSTRAINT timeline_phases_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id)
);
CREATE TABLE public.volunteers (
  start_timestamp timestamp with time zone NOT NULL,
  end_timestamp timestamp with time zone,
  volunteering_job_title text,
  volunteering_job_desc text,
  request_submit_timestamp timestamp with time zone NOT NULL,
  member_id uuid NOT NULL,
  approved text CHECK (approved = ANY (ARRAY['approved'::text, 'denied'::text, 'waiting'::text])),
  supervisor_comment text,
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  CONSTRAINT volunteers_pkey PRIMARY KEY (id),
  CONSTRAINT volunteers_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.members(member_id)
);