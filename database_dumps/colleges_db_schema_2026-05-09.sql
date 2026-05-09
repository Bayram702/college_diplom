--
-- PostgreSQL database dump
--

\restrict c9AmmA8ohXn5ynC8upOYMA1HbvDVRJAw6zfCRGA9K7nyyh2v2uq5Mkz8TzhQPGY

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: applications_set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.applications_set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;


--
-- Name: enforce_applications_constraints(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enforce_applications_constraints() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  application_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO application_count
  FROM applications
  WHERE applicant_id = NEW.applicant_id
    AND status != 'cancelled';

  IF application_count >= 5 THEN
    RAISE EXCEPTION 'Превышен лимит: максимум 5 активных заявок на одного абитуриента';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM users u
    JOIN roles r ON r.id = u.role_id
    WHERE u.id = NEW.applicant_id
      AND r.name = 'applicant'
  ) THEN
    RAISE EXCEPTION 'Подача заявлений доступна только пользователям с ролью applicant';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM college_specialties cs
    JOIN specialties s ON s.id = cs.specialty_id
    JOIN colleges c ON c.id = cs.college_id
    WHERE cs.college_id = NEW.college_id
      AND cs.specialty_id = NEW.specialty_id
      AND cs.is_active = true
      AND s.status = 'active'
      AND c.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Выбранная специальность не принадлежит колледжу или недоступна';
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: applications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.applications (
    id integer NOT NULL,
    applicant_id integer NOT NULL,
    college_id integer NOT NULL,
    specialty_id integer NOT NULL,
    applicant_name character varying(255) NOT NULL,
    phone character varying(20) NOT NULL,
    email character varying(255) NOT NULL,
    avg_score numeric(3,2) NOT NULL,
    needs_dormitory boolean DEFAULT false NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    decided_at timestamp without time zone,
    decided_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    passport_series character varying(4),
    passport_number character varying(6),
    CONSTRAINT applications_avg_score_check CHECK (((avg_score >= 2.00) AND (avg_score <= 5.00) AND (avg_score = round(avg_score, 2)))),
    CONSTRAINT applications_passport_number_format CHECK (((passport_number IS NULL) OR ((passport_number)::text ~ '^[0-9]{6}$'::text))),
    CONSTRAINT applications_passport_series_format CHECK (((passport_series IS NULL) OR ((passport_series)::text ~ '^[0-9]{4}$'::text))),
    CONSTRAINT applications_phone_check CHECK (((phone)::text ~ '^\+7[0-9]{10}$'::text)),
    CONSTRAINT applications_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'accepted'::character varying, 'rejected'::character varying, 'cancelled'::character varying])::text[])))
);


--
-- Name: applications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.applications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: applications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.applications_id_seq OWNED BY public.applications.id;


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id bigint NOT NULL,
    entity_type character varying(50) NOT NULL,
    entity_id integer NOT NULL,
    entity_name character varying(255),
    user_id integer NOT NULL,
    action character varying(20) NOT NULL,
    changes jsonb,
    previous_state jsonb,
    new_state jsonb,
    ip_address character varying(45),
    user_agent text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.audit_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: cities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cities (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    type character varying(50),
    region character varying(100),
    population integer,
    coordinates character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: cities_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cities_id_seq OWNED BY public.cities.id;


--
-- Name: college_addresses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.college_addresses (
    id integer NOT NULL,
    college_id integer NOT NULL,
    name character varying(100) NOT NULL,
    address text NOT NULL,
    phone character varying(50),
    email character varying(255),
    coordinates character varying(100),
    photo_url character varying(255),
    is_main boolean DEFAULT false,
    sort_order integer DEFAULT 0,
    address_type character varying(50) DEFAULT 'educational'::character varying,
    working_hours character varying(100),
    contact_person character varying(255)
);


--
-- Name: college_addresses_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.college_addresses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: college_addresses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.college_addresses_id_seq OWNED BY public.college_addresses.id;


--
-- Name: college_reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.college_reviews (
    id integer NOT NULL,
    college_id integer NOT NULL,
    user_id integer NOT NULL,
    rating integer NOT NULL,
    text text NOT NULL,
    status character varying(20) DEFAULT 'published'::character varying NOT NULL,
    moderation_reason character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT college_reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5))),
    CONSTRAINT college_reviews_status_check CHECK (((status)::text = ANY ((ARRAY['published'::character varying, 'rejected'::character varying])::text[])))
);


--
-- Name: college_reviews_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.college_reviews_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: college_reviews_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.college_reviews_id_seq OWNED BY public.college_reviews.id;


--
-- Name: college_specialties; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.college_specialties (
    id integer NOT NULL,
    college_id integer NOT NULL,
    specialty_id integer NOT NULL,
    budget_places integer,
    commercial_places integer,
    price_per_year numeric(10,2),
    avg_score numeric(3,2),
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: college_specialties_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.college_specialties_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: college_specialties_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.college_specialties_id_seq OWNED BY public.college_specialties.id;


--
-- Name: college_views; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.college_views (
    id integer NOT NULL,
    college_id integer NOT NULL,
    applicant_id integer,
    viewed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    ip_address character varying(64),
    user_agent text
);


--
-- Name: college_views_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.college_views_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: college_views_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.college_views_id_seq OWNED BY public.college_views.id;


--
-- Name: colleges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.colleges (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    short_name character varying(100),
    description text,
    status character varying(20) DEFAULT 'active'::character varying,
    city_id integer,
    budget_places integer DEFAULT 0,
    commercial_places integer DEFAULT 0,
    avg_score numeric(3,2),
    min_score numeric(3,2),
    phone character varying(50),
    email character varying(255),
    website character varying(255),
    admission_url character varying(255),
    social_vk character varying(255),
    social_max character varying(255),
    social_other jsonb,
    is_professionalitet boolean DEFAULT false,
    professionalitet_cluster character varying(100),
    logo_image_url character varying(255),
    main_image_url character varying(255),
    opportunities jsonb,
    employers jsonb,
    workshops jsonb,
    professions jsonb,
    ovz_programs jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by integer,
    updated_by integer
);


--
-- Name: colleges_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.colleges_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: colleges_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.colleges_id_seq OWNED BY public.colleges.id;


--
-- Name: favorites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.favorites (
    id integer NOT NULL,
    user_id integer NOT NULL,
    entity_type character varying(20) NOT NULL,
    entity_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT favorites_entity_type_check CHECK (((entity_type)::text = ANY ((ARRAY['college'::character varying, 'specialty'::character varying])::text[])))
);


--
-- Name: favorites_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.favorites_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: favorites_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.favorites_id_seq OWNED BY public.favorites.id;


--
-- Name: login_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.login_logs (
    id integer NOT NULL,
    user_id integer NOT NULL,
    login_time timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    ip_address character varying(45),
    user_agent text,
    success boolean NOT NULL,
    failure_reason character varying(255),
    session_id character varying(255)
);


--
-- Name: login_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.login_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: login_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.login_logs_id_seq OWNED BY public.login_logs.id;


--
-- Name: password_reset_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.password_reset_codes (
    id integer NOT NULL,
    user_id integer NOT NULL,
    code_hash character varying(255) NOT NULL,
    purpose character varying(50) DEFAULT 'password_change'::character varying NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    used_at timestamp without time zone,
    attempts integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: password_reset_codes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.password_reset_codes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: password_reset_codes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.password_reset_codes_id_seq OWNED BY public.password_reset_codes.id;


--
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schema_migrations (
    id integer NOT NULL,
    filename character varying(255) NOT NULL,
    applied_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: schema_migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.schema_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: schema_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.schema_migrations_id_seq OWNED BY public.schema_migrations.id;


--
-- Name: sectors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sectors (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    code character varying(50),
    description text,
    image_url character varying(255),
    sort_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: sectors_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sectors_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sectors_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sectors_id_seq OWNED BY public.sectors.id;


--
-- Name: site_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.site_settings (
    id integer NOT NULL,
    setting_key character varying(100) NOT NULL,
    setting_value jsonb NOT NULL,
    setting_type character varying(20) DEFAULT 'string'::character varying,
    description text,
    updated_by integer,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: site_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.site_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: site_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.site_settings_id_seq OWNED BY public.site_settings.id;


--
-- Name: specialties; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.specialties (
    id integer NOT NULL,
    code character varying(20) NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    qualification character varying(100),
    duration character varying(50),
    base_education character varying(2) NOT NULL,
    form character varying(20) DEFAULT 'full-time'::character varying,
    budget_places integer DEFAULT 0,
    commercial_places integer DEFAULT 0,
    price_per_year numeric(10,2),
    exams text,
    avg_score_last_year numeric(3,2),
    status character varying(20) DEFAULT 'draft'::character varying,
    is_professionalitet boolean DEFAULT false,
    sort_order integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: specialties_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.specialties_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: specialties_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.specialties_id_seq OWNED BY public.specialties.id;


--
-- Name: specialty_sectors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.specialty_sectors (
    specialty_id integer NOT NULL,
    sector_id integer NOT NULL
);


--
-- Name: spo_specialty_catalog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.spo_specialty_catalog (
    specialty_code character varying(20) NOT NULL,
    specialty_name text NOT NULL,
    sector_code character varying(20) NOT NULL,
    sector_name text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: user_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_sessions (
    id character varying(255) NOT NULL,
    user_id integer NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    last_activity timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    ip_address character varying(45),
    user_agent text,
    is_active boolean DEFAULT true
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    login character varying(100) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    role_id integer NOT NULL,
    college_id integer,
    status character varying(20) DEFAULT 'active'::character varying,
    last_login_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    phone character varying(50),
    passport_series character varying(4),
    passport_number character varying(6),
    avg_score numeric(3,2),
    last_activity_at timestamp without time zone,
    CONSTRAINT users_avg_score_format CHECK (((avg_score IS NULL) OR ((avg_score >= 2.00) AND (avg_score <= 5.00) AND (avg_score = round(avg_score, 2))))),
    CONSTRAINT users_passport_number_format CHECK (((passport_number IS NULL) OR ((passport_number)::text ~ '^[0-9]{6}$'::text))),
    CONSTRAINT users_passport_series_format CHECK (((passport_series IS NULL) OR ((passport_series)::text ~ '^[0-9]{4}$'::text)))
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: applications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications ALTER COLUMN id SET DEFAULT nextval('public.applications_id_seq'::regclass);


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: cities id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cities ALTER COLUMN id SET DEFAULT nextval('public.cities_id_seq'::regclass);


--
-- Name: college_addresses id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.college_addresses ALTER COLUMN id SET DEFAULT nextval('public.college_addresses_id_seq'::regclass);


--
-- Name: college_reviews id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.college_reviews ALTER COLUMN id SET DEFAULT nextval('public.college_reviews_id_seq'::regclass);


--
-- Name: college_specialties id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.college_specialties ALTER COLUMN id SET DEFAULT nextval('public.college_specialties_id_seq'::regclass);


--
-- Name: college_views id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.college_views ALTER COLUMN id SET DEFAULT nextval('public.college_views_id_seq'::regclass);


--
-- Name: colleges id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.colleges ALTER COLUMN id SET DEFAULT nextval('public.colleges_id_seq'::regclass);


--
-- Name: favorites id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorites ALTER COLUMN id SET DEFAULT nextval('public.favorites_id_seq'::regclass);


--
-- Name: login_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.login_logs ALTER COLUMN id SET DEFAULT nextval('public.login_logs_id_seq'::regclass);


--
-- Name: password_reset_codes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_codes ALTER COLUMN id SET DEFAULT nextval('public.password_reset_codes_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: schema_migrations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations ALTER COLUMN id SET DEFAULT nextval('public.schema_migrations_id_seq'::regclass);


--
-- Name: sectors id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sectors ALTER COLUMN id SET DEFAULT nextval('public.sectors_id_seq'::regclass);


--
-- Name: site_settings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_settings ALTER COLUMN id SET DEFAULT nextval('public.site_settings_id_seq'::regclass);


--
-- Name: specialties id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.specialties ALTER COLUMN id SET DEFAULT nextval('public.specialties_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: applications applications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: cities cities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cities
    ADD CONSTRAINT cities_pkey PRIMARY KEY (id);


--
-- Name: college_addresses college_addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.college_addresses
    ADD CONSTRAINT college_addresses_pkey PRIMARY KEY (id);


--
-- Name: college_reviews college_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.college_reviews
    ADD CONSTRAINT college_reviews_pkey PRIMARY KEY (id);


--
-- Name: college_specialties college_specialties_college_id_specialty_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.college_specialties
    ADD CONSTRAINT college_specialties_college_id_specialty_id_key UNIQUE (college_id, specialty_id);


--
-- Name: college_specialties college_specialties_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.college_specialties
    ADD CONSTRAINT college_specialties_pkey PRIMARY KEY (id);


--
-- Name: college_views college_views_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.college_views
    ADD CONSTRAINT college_views_pkey PRIMARY KEY (id);


--
-- Name: colleges colleges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.colleges
    ADD CONSTRAINT colleges_pkey PRIMARY KEY (id);


--
-- Name: favorites favorites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_pkey PRIMARY KEY (id);


--
-- Name: favorites favorites_user_id_entity_type_entity_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_user_id_entity_type_entity_id_key UNIQUE (user_id, entity_type, entity_id);


--
-- Name: login_logs login_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.login_logs
    ADD CONSTRAINT login_logs_pkey PRIMARY KEY (id);


--
-- Name: password_reset_codes password_reset_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_codes
    ADD CONSTRAINT password_reset_codes_pkey PRIMARY KEY (id);


--
-- Name: roles roles_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key UNIQUE (name);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_filename_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_filename_key UNIQUE (filename);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (id);


--
-- Name: sectors sectors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sectors
    ADD CONSTRAINT sectors_pkey PRIMARY KEY (id);


--
-- Name: site_settings site_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_settings
    ADD CONSTRAINT site_settings_pkey PRIMARY KEY (id);


--
-- Name: site_settings site_settings_setting_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_settings
    ADD CONSTRAINT site_settings_setting_key_key UNIQUE (setting_key);


--
-- Name: specialties specialties_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.specialties
    ADD CONSTRAINT specialties_pkey PRIMARY KEY (id);


--
-- Name: specialty_sectors specialty_sectors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.specialty_sectors
    ADD CONSTRAINT specialty_sectors_pkey PRIMARY KEY (specialty_id, sector_id);


--
-- Name: spo_specialty_catalog spo_specialty_catalog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spo_specialty_catalog
    ADD CONSTRAINT spo_specialty_catalog_pkey PRIMARY KEY (specialty_code);


--
-- Name: user_sessions user_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_login_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_login_key UNIQUE (login);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_applications_applicant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_applications_applicant_id ON public.applications USING btree (applicant_id);


--
-- Name: idx_applications_college_specialty; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_applications_college_specialty ON public.applications USING btree (college_id, specialty_id);


--
-- Name: idx_applications_college_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_applications_college_status ON public.applications USING btree (college_id, status, created_at DESC);


--
-- Name: idx_audit_logs_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_entity ON public.audit_logs USING btree (entity_type, entity_id);


--
-- Name: idx_audit_logs_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_time ON public.audit_logs USING btree (created_at DESC);


--
-- Name: idx_audit_logs_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_user ON public.audit_logs USING btree (user_id);


--
-- Name: idx_cities_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cities_name ON public.cities USING btree (name);


--
-- Name: idx_college_addresses_college; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_college_addresses_college ON public.college_addresses USING btree (college_id);


--
-- Name: idx_college_reviews_college_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_college_reviews_college_id ON public.college_reviews USING btree (college_id, created_at DESC);


--
-- Name: idx_college_reviews_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_college_reviews_user_id ON public.college_reviews USING btree (user_id, created_at DESC);


--
-- Name: idx_college_specialties_college; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_college_specialties_college ON public.college_specialties USING btree (college_id);


--
-- Name: idx_college_specialties_college_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_college_specialties_college_id ON public.college_specialties USING btree (college_id);


--
-- Name: idx_college_specialties_specialty; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_college_specialties_specialty ON public.college_specialties USING btree (specialty_id);


--
-- Name: idx_college_specialties_specialty_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_college_specialties_specialty_id ON public.college_specialties USING btree (specialty_id);


--
-- Name: idx_college_specialty_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_college_specialty_search ON public.college_specialties USING btree (college_id, is_active, sort_order);


--
-- Name: idx_college_views_applicant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_college_views_applicant_id ON public.college_views USING btree (applicant_id, viewed_at DESC);


--
-- Name: idx_college_views_college_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_college_views_college_id ON public.college_views USING btree (college_id, viewed_at DESC);


--
-- Name: idx_colleges_city; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_colleges_city ON public.colleges USING btree (city_id);


--
-- Name: idx_colleges_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_colleges_name ON public.colleges USING btree (name);


--
-- Name: idx_colleges_professionalitet; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_colleges_professionalitet ON public.colleges USING btree (is_professionalitet);


--
-- Name: idx_colleges_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_colleges_search ON public.colleges USING gin (to_tsvector('russian'::regconfig, (((name)::text || ' '::text) || COALESCE(description, ''::text))));


--
-- Name: idx_colleges_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_colleges_status ON public.colleges USING btree (status);


--
-- Name: idx_favorites_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_favorites_entity ON public.favorites USING btree (entity_type, entity_id);


--
-- Name: idx_favorites_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_favorites_user_id ON public.favorites USING btree (user_id);


--
-- Name: idx_login_logs_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_login_logs_time ON public.login_logs USING btree (login_time);


--
-- Name: idx_login_logs_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_login_logs_user ON public.login_logs USING btree (user_id, login_time);


--
-- Name: idx_login_security; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_login_security ON public.login_logs USING btree (user_id, success, login_time DESC);


--
-- Name: idx_password_reset_codes_user_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_password_reset_codes_user_active ON public.password_reset_codes USING btree (user_id, purpose, expires_at DESC) WHERE (used_at IS NULL);


--
-- Name: idx_sectors_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sectors_active ON public.sectors USING btree (is_active);


--
-- Name: idx_sectors_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sectors_code ON public.sectors USING btree (code);


--
-- Name: idx_sessions_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_expires ON public.user_sessions USING btree (expires_at);


--
-- Name: idx_sessions_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_user ON public.user_sessions USING btree (user_id);


--
-- Name: idx_site_settings_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_site_settings_key ON public.site_settings USING btree (setting_key);


--
-- Name: idx_specialties_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_specialties_code ON public.specialties USING btree (code);


--
-- Name: idx_specialties_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_specialties_name ON public.specialties USING btree (name);


--
-- Name: idx_specialties_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_specialties_search ON public.specialties USING gin (to_tsvector('russian'::regconfig, (((name)::text || ' '::text) || COALESCE(description, ''::text))));


--
-- Name: idx_specialties_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_specialties_status ON public.specialties USING btree (status);


--
-- Name: idx_specialty_filter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_specialty_filter ON public.specialties USING btree (status, base_education, form);


--
-- Name: idx_specialty_sectors_sector_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_specialty_sectors_sector_id ON public.specialty_sectors USING btree (sector_id);


--
-- Name: idx_specialty_sectors_specialty_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_specialty_sectors_specialty_id ON public.specialty_sectors USING btree (specialty_id);


--
-- Name: idx_spo_specialty_catalog_sector_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_spo_specialty_catalog_sector_code ON public.spo_specialty_catalog USING btree (sector_code);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_login; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_login ON public.users USING btree (login);


--
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_role ON public.users USING btree (role_id);


--
-- Name: uq_applications_applicant_college_specialty_active; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_applications_applicant_college_specialty_active ON public.applications USING btree (applicant_id, college_id, specialty_id) WHERE ((status)::text <> 'cancelled'::text);


--
-- Name: uq_college_reviews_user_college_published; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_college_reviews_user_college_published ON public.college_reviews USING btree (user_id, college_id) WHERE ((status)::text = 'published'::text);


--
-- Name: uq_users_passport; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_users_passport ON public.users USING btree (passport_series, passport_number) WHERE ((passport_series IS NOT NULL) AND (passport_number IS NOT NULL));


--
-- Name: applications trg_applications_constraints; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_applications_constraints BEFORE INSERT ON public.applications FOR EACH ROW EXECUTE FUNCTION public.enforce_applications_constraints();


--
-- Name: applications trg_applications_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_applications_updated_at BEFORE UPDATE ON public.applications FOR EACH ROW EXECUTE FUNCTION public.applications_set_updated_at();


--
-- Name: college_specialties trg_college_specialties_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_college_specialties_updated BEFORE UPDATE ON public.college_specialties FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: colleges trg_colleges_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_colleges_updated BEFORE UPDATE ON public.colleges FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: roles trg_roles_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_roles_updated BEFORE UPDATE ON public.roles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: sectors trg_sectors_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_sectors_updated BEFORE UPDATE ON public.sectors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: site_settings trg_site_settings_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_site_settings_updated BEFORE UPDATE ON public.site_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: specialties trg_specialties_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_specialties_updated BEFORE UPDATE ON public.specialties FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: users trg_users_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_users_updated BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: applications applications_applicant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_applicant_id_fkey FOREIGN KEY (applicant_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: applications applications_college_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_college_id_fkey FOREIGN KEY (college_id) REFERENCES public.colleges(id) ON DELETE CASCADE;


--
-- Name: applications applications_decided_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_decided_by_fkey FOREIGN KEY (decided_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: applications applications_specialty_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_specialty_id_fkey FOREIGN KEY (specialty_id) REFERENCES public.specialties(id) ON DELETE RESTRICT;


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: college_addresses college_addresses_college_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.college_addresses
    ADD CONSTRAINT college_addresses_college_id_fkey FOREIGN KEY (college_id) REFERENCES public.colleges(id) ON DELETE CASCADE;


--
-- Name: college_reviews college_reviews_college_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.college_reviews
    ADD CONSTRAINT college_reviews_college_id_fkey FOREIGN KEY (college_id) REFERENCES public.colleges(id) ON DELETE CASCADE;


--
-- Name: college_reviews college_reviews_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.college_reviews
    ADD CONSTRAINT college_reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: college_specialties college_specialties_college_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.college_specialties
    ADD CONSTRAINT college_specialties_college_id_fkey FOREIGN KEY (college_id) REFERENCES public.colleges(id) ON DELETE CASCADE;


--
-- Name: college_specialties college_specialties_specialty_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.college_specialties
    ADD CONSTRAINT college_specialties_specialty_id_fkey FOREIGN KEY (specialty_id) REFERENCES public.specialties(id) ON DELETE CASCADE;


--
-- Name: college_views college_views_applicant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.college_views
    ADD CONSTRAINT college_views_applicant_id_fkey FOREIGN KEY (applicant_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: college_views college_views_college_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.college_views
    ADD CONSTRAINT college_views_college_id_fkey FOREIGN KEY (college_id) REFERENCES public.colleges(id) ON DELETE CASCADE;


--
-- Name: colleges colleges_city_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.colleges
    ADD CONSTRAINT colleges_city_id_fkey FOREIGN KEY (city_id) REFERENCES public.cities(id);


--
-- Name: favorites favorites_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: colleges fk_colleges_created_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.colleges
    ADD CONSTRAINT fk_colleges_created_by FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: colleges fk_colleges_updated_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.colleges
    ADD CONSTRAINT fk_colleges_updated_by FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: users fk_users_college; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT fk_users_college FOREIGN KEY (college_id) REFERENCES public.colleges(id) ON DELETE SET NULL;


--
-- Name: login_logs login_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.login_logs
    ADD CONSTRAINT login_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: password_reset_codes password_reset_codes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_codes
    ADD CONSTRAINT password_reset_codes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: site_settings site_settings_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_settings
    ADD CONSTRAINT site_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: specialty_sectors specialty_sectors_sector_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.specialty_sectors
    ADD CONSTRAINT specialty_sectors_sector_id_fkey FOREIGN KEY (sector_id) REFERENCES public.sectors(id) ON DELETE CASCADE;


--
-- Name: specialty_sectors specialty_sectors_specialty_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.specialty_sectors
    ADD CONSTRAINT specialty_sectors_specialty_id_fkey FOREIGN KEY (specialty_id) REFERENCES public.specialties(id) ON DELETE CASCADE;


--
-- Name: user_sessions user_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: users users_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id);


--
-- PostgreSQL database dump complete
--

\unrestrict c9AmmA8ohXn5ynC8upOYMA1HbvDVRJAw6zfCRGA9K7nyyh2v2uq5Mkz8TzhQPGY

