--
-- PostgreSQL database dump
--

\restrict BOyFiF2Do20qlVkqfTAESzwYV6m5g50Z1lxPE5YbogdcLF9VMYioRQpqevPfm1R

-- Dumped from database version 18.6 (Debian 18.6-3)
-- Dumped by pg_dump version 18.6 (Debian 18.6-3)

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

ALTER TABLE IF EXISTS ONLY public.work_items DROP CONSTRAINT IF EXISTS work_items_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.work_events DROP CONSTRAINT IF EXISTS work_events_work_id_fkey;
ALTER TABLE IF EXISTS ONLY public.work_events DROP CONSTRAINT IF EXISTS work_events_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.watches DROP CONSTRAINT IF EXISTS watches_work_id_fkey;
ALTER TABLE IF EXISTS ONLY public.watches DROP CONSTRAINT IF EXISTS watches_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.uploads DROP CONSTRAINT IF EXISTS uploads_owner_id_fkey;
ALTER TABLE IF EXISTS ONLY public.sessions DROP CONSTRAINT IF EXISTS sessions_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.security_events DROP CONSTRAINT IF EXISTS security_events_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.roles DROP CONSTRAINT IF EXISTS roles_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.roles DROP CONSTRAINT IF EXISTS roles_business_id_fkey;
ALTER TABLE IF EXISTS ONLY public.profiles DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.otp_logs DROP CONSTRAINT IF EXISTS otp_logs_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.onboarding_roles DROP CONSTRAINT IF EXISTS onboarding_roles_category_key_fkey;
ALTER TABLE IF EXISTS ONLY public.onboarding_answers DROP CONSTRAINT IF EXISTS onboarding_answers_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.follows DROP CONSTRAINT IF EXISTS follows_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.follows DROP CONSTRAINT IF EXISTS follows_follower_id_fkey;
ALTER TABLE IF EXISTS ONLY public.follows DROP CONSTRAINT IF EXISTS follows_business_id_fkey;
ALTER TABLE IF EXISTS ONLY public.work_items DROP CONSTRAINT IF EXISTS fk_work_items_source_id;
ALTER TABLE IF EXISTS ONLY public.chat_messages DROP CONSTRAINT IF EXISTS chat_messages_recipient_id_fkey;
ALTER TABLE IF EXISTS ONLY public.chat_messages DROP CONSTRAINT IF EXISTS chat_messages_author_id_fkey;
ALTER TABLE IF EXISTS ONLY public.business_work_links DROP CONSTRAINT IF EXISTS business_work_links_work_id_fkey;
ALTER TABLE IF EXISTS ONLY public.business_work_links DROP CONSTRAINT IF EXISTS business_work_links_business_id_fkey;
ALTER TABLE IF EXISTS ONLY public.business_offerings DROP CONSTRAINT IF EXISTS business_offerings_business_id_fkey;
ALTER TABLE IF EXISTS ONLY public.business_members DROP CONSTRAINT IF EXISTS business_members_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.business_members DROP CONSTRAINT IF EXISTS business_members_business_id_fkey;
ALTER TABLE IF EXISTS ONLY public.broadcasts DROP CONSTRAINT IF EXISTS broadcasts_admin_id_fkey;
ALTER TABLE IF EXISTS ONLY public.blocked_ips DROP CONSTRAINT IF EXISTS blocked_ips_blocked_by_fkey;
ALTER TABLE IF EXISTS ONLY public.admin_actions DROP CONSTRAINT IF EXISTS admin_actions_admin_id_fkey;
DROP INDEX IF EXISTS public.uq_notifications_unread_message;
DROP INDEX IF EXISTS public.ix_work_templates_kind;
DROP INDEX IF EXISTS public.ix_work_items_user_id;
DROP INDEX IF EXISTS public.ix_work_events_work_id;
DROP INDEX IF EXISTS public.ix_work_events_user_id;
DROP INDEX IF EXISTS public.ix_work_events_created_at;
DROP INDEX IF EXISTS public.ix_watches_work_id;
DROP INDEX IF EXISTS public.ix_watches_user_id;
DROP INDEX IF EXISTS public.ix_users_username;
DROP INDEX IF EXISTS public.ix_users_phone_number;
DROP INDEX IF EXISTS public.ix_users_email;
DROP INDEX IF EXISTS public.ix_uploads_owner_id;
DROP INDEX IF EXISTS public.ix_sessions_user_id;
DROP INDEX IF EXISTS public.ix_sessions_token_hash;
DROP INDEX IF EXISTS public.ix_security_events_user_id;
DROP INDEX IF EXISTS public.ix_security_events_kind;
DROP INDEX IF EXISTS public.ix_security_events_ip;
DROP INDEX IF EXISTS public.ix_security_events_created_at;
DROP INDEX IF EXISTS public.ix_roles_user_id;
DROP INDEX IF EXISTS public.ix_roles_business_id;
DROP INDEX IF EXISTS public.ix_profiles_username;
DROP INDEX IF EXISTS public.ix_otp_logs_destination;
DROP INDEX IF EXISTS public.ix_onboarding_roles_category_key;
DROP INDEX IF EXISTS public.ix_onboarding_answers_user_id;
DROP INDEX IF EXISTS public.ix_onboarding_answers_question_key;
DROP INDEX IF EXISTS public.ix_notifications_user_id;
DROP INDEX IF EXISTS public.ix_notifications_created_at;
DROP INDEX IF EXISTS public.ix_follows_user_id;
DROP INDEX IF EXISTS public.ix_follows_follower_id;
DROP INDEX IF EXISTS public.ix_follows_business_id;
DROP INDEX IF EXISTS public.ix_chat_messages_unread;
DROP INDEX IF EXISTS public.ix_chat_messages_topic_id;
DROP INDEX IF EXISTS public.ix_businesses_slug;
DROP INDEX IF EXISTS public.ix_business_work_links_work_id;
DROP INDEX IF EXISTS public.ix_business_work_links_business_id;
DROP INDEX IF EXISTS public.ix_business_offerings_business_id;
DROP INDEX IF EXISTS public.ix_broadcasts_created_at;
DROP INDEX IF EXISTS public.ix_admin_actions_created_at;
DROP INDEX IF EXISTS public.ix_admin_actions_admin_id;
ALTER TABLE IF EXISTS ONLY public.work_templates DROP CONSTRAINT IF EXISTS work_templates_pkey;
ALTER TABLE IF EXISTS ONLY public.work_items DROP CONSTRAINT IF EXISTS work_items_pkey;
ALTER TABLE IF EXISTS ONLY public.work_events DROP CONSTRAINT IF EXISTS work_events_pkey;
ALTER TABLE IF EXISTS ONLY public.watches DROP CONSTRAINT IF EXISTS watches_user_id_work_id_key;
ALTER TABLE IF EXISTS ONLY public.watches DROP CONSTRAINT IF EXISTS watches_pkey;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE IF EXISTS ONLY public.chat_messages DROP CONSTRAINT IF EXISTS uq_chat_messages_author_client;
ALTER TABLE IF EXISTS ONLY public.uploads DROP CONSTRAINT IF EXISTS uploads_pkey;
ALTER TABLE IF EXISTS ONLY public.sessions DROP CONSTRAINT IF EXISTS sessions_pkey;
ALTER TABLE IF EXISTS ONLY public.security_events DROP CONSTRAINT IF EXISTS security_events_pkey;
ALTER TABLE IF EXISTS ONLY public.roles DROP CONSTRAINT IF EXISTS roles_pkey;
ALTER TABLE IF EXISTS ONLY public.profiles DROP CONSTRAINT IF EXISTS profiles_user_id_key;
ALTER TABLE IF EXISTS ONLY public.profiles DROP CONSTRAINT IF EXISTS profiles_pkey;
ALTER TABLE IF EXISTS ONLY public.platform_settings DROP CONSTRAINT IF EXISTS platform_settings_pkey;
ALTER TABLE IF EXISTS ONLY public.otp_logs DROP CONSTRAINT IF EXISTS otp_logs_pkey;
ALTER TABLE IF EXISTS ONLY public.onboarding_roles DROP CONSTRAINT IF EXISTS onboarding_roles_pkey;
ALTER TABLE IF EXISTS ONLY public.onboarding_questions DROP CONSTRAINT IF EXISTS onboarding_questions_pkey;
ALTER TABLE IF EXISTS ONLY public.onboarding_categories DROP CONSTRAINT IF EXISTS onboarding_categories_pkey;
ALTER TABLE IF EXISTS ONLY public.onboarding_answers DROP CONSTRAINT IF EXISTS onboarding_answers_user_id_question_key_key;
ALTER TABLE IF EXISTS ONLY public.onboarding_answers DROP CONSTRAINT IF EXISTS onboarding_answers_pkey;
ALTER TABLE IF EXISTS ONLY public.notifications DROP CONSTRAINT IF EXISTS notifications_pkey;
ALTER TABLE IF EXISTS ONLY public.follows DROP CONSTRAINT IF EXISTS follows_pkey;
ALTER TABLE IF EXISTS ONLY public.follows DROP CONSTRAINT IF EXISTS follows_follower_id_user_id_business_id_key;
ALTER TABLE IF EXISTS ONLY public.chat_messages DROP CONSTRAINT IF EXISTS chat_messages_pkey;
ALTER TABLE IF EXISTS ONLY public.businesses DROP CONSTRAINT IF EXISTS businesses_pkey;
ALTER TABLE IF EXISTS ONLY public.business_work_links DROP CONSTRAINT IF EXISTS business_work_links_pkey;
ALTER TABLE IF EXISTS ONLY public.business_work_links DROP CONSTRAINT IF EXISTS business_work_links_business_id_work_id_key;
ALTER TABLE IF EXISTS ONLY public.business_offerings DROP CONSTRAINT IF EXISTS business_offerings_pkey;
ALTER TABLE IF EXISTS ONLY public.business_members DROP CONSTRAINT IF EXISTS business_members_pkey;
ALTER TABLE IF EXISTS ONLY public.broadcasts DROP CONSTRAINT IF EXISTS broadcasts_pkey;
ALTER TABLE IF EXISTS ONLY public.blocked_ips DROP CONSTRAINT IF EXISTS blocked_ips_pkey;
ALTER TABLE IF EXISTS ONLY public.alembic_version DROP CONSTRAINT IF EXISTS alembic_version_pkc;
ALTER TABLE IF EXISTS ONLY public.admin_actions DROP CONSTRAINT IF EXISTS admin_actions_pkey;
ALTER TABLE IF EXISTS public.chat_messages ALTER COLUMN id DROP DEFAULT;
DROP TABLE IF EXISTS public.work_templates;
DROP TABLE IF EXISTS public.work_items;
DROP TABLE IF EXISTS public.work_events;
DROP TABLE IF EXISTS public.watches;
DROP TABLE IF EXISTS public.users;
DROP TABLE IF EXISTS public.uploads;
DROP TABLE IF EXISTS public.sessions;
DROP TABLE IF EXISTS public.security_events;
DROP TABLE IF EXISTS public.roles;
DROP TABLE IF EXISTS public.profiles;
DROP TABLE IF EXISTS public.platform_settings;
DROP TABLE IF EXISTS public.otp_logs;
DROP TABLE IF EXISTS public.onboarding_roles;
DROP TABLE IF EXISTS public.onboarding_questions;
DROP TABLE IF EXISTS public.onboarding_categories;
DROP TABLE IF EXISTS public.onboarding_answers;
DROP TABLE IF EXISTS public.notifications;
DROP TABLE IF EXISTS public.follows;
DROP SEQUENCE IF EXISTS public.chat_messages_id_seq;
DROP TABLE IF EXISTS public.chat_messages;
DROP TABLE IF EXISTS public.businesses;
DROP TABLE IF EXISTS public.business_work_links;
DROP TABLE IF EXISTS public.business_offerings;
DROP TABLE IF EXISTS public.business_members;
DROP TABLE IF EXISTS public.broadcasts;
DROP TABLE IF EXISTS public.blocked_ips;
DROP TABLE IF EXISTS public.alembic_version;
DROP TABLE IF EXISTS public.admin_actions;
DROP TYPE IF EXISTS public.visibility;
DROP EXTENSION IF EXISTS citext;
--
-- Name: citext; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA public;


--
-- Name: EXTENSION citext; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION citext IS 'data type for case-insensitive character strings';


--
-- Name: visibility; Type: TYPE; Schema: public; Owner: ibrahim_kimaro
--

CREATE TYPE public.visibility AS ENUM (
    'public',
    'unlisted',
    'private',
    'draft'
);


ALTER TYPE public.visibility OWNER TO ibrahim_kimaro;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admin_actions; Type: TABLE; Schema: public; Owner: ibrahim_kimaro
--

CREATE TABLE public.admin_actions (
    id uuid NOT NULL,
    admin_id uuid,
    action character varying(60) NOT NULL,
    target character varying(200),
    details jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.admin_actions OWNER TO ibrahim_kimaro;

--
-- Name: alembic_version; Type: TABLE; Schema: public; Owner: ibrahim_kimaro
--

CREATE TABLE public.alembic_version (
    version_num character varying(32) NOT NULL
);


ALTER TABLE public.alembic_version OWNER TO ibrahim_kimaro;

--
-- Name: blocked_ips; Type: TABLE; Schema: public; Owner: ibrahim_kimaro
--

CREATE TABLE public.blocked_ips (
    ip character varying(64) NOT NULL,
    reason character varying(200) DEFAULT ''::character varying NOT NULL,
    blocked_by uuid,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.blocked_ips OWNER TO ibrahim_kimaro;

--
-- Name: broadcasts; Type: TABLE; Schema: public; Owner: ibrahim_kimaro
--

CREATE TABLE public.broadcasts (
    id uuid NOT NULL,
    admin_id uuid,
    channel character varying(10) NOT NULL,
    segment character varying(20) NOT NULL,
    subject character varying(160) DEFAULT ''::character varying NOT NULL,
    body text NOT NULL,
    recipients integer DEFAULT 0 NOT NULL,
    delivery character varying(20) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.broadcasts OWNER TO ibrahim_kimaro;

--
-- Name: business_members; Type: TABLE; Schema: public; Owner: ibrahim_kimaro
--

CREATE TABLE public.business_members (
    business_id uuid NOT NULL,
    user_id uuid NOT NULL,
    permission character varying(10) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.business_members OWNER TO ibrahim_kimaro;

--
-- Name: business_offerings; Type: TABLE; Schema: public; Owner: ibrahim_kimaro
--

CREATE TABLE public.business_offerings (
    id uuid NOT NULL,
    business_id uuid NOT NULL,
    kind character varying(10) NOT NULL,
    name character varying(150) NOT NULL,
    description text,
    price character varying(60),
    sort integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.business_offerings OWNER TO ibrahim_kimaro;

--
-- Name: business_work_links; Type: TABLE; Schema: public; Owner: ibrahim_kimaro
--

CREATE TABLE public.business_work_links (
    id uuid NOT NULL,
    business_id uuid NOT NULL,
    work_id uuid NOT NULL,
    status character varying(10) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.business_work_links OWNER TO ibrahim_kimaro;

--
-- Name: businesses; Type: TABLE; Schema: public; Owner: ibrahim_kimaro
--

CREATE TABLE public.businesses (
    id uuid NOT NULL,
    slug character varying(60) NOT NULL,
    name character varying(150) NOT NULL,
    type character varying(20) NOT NULL,
    description text,
    visibility public.visibility DEFAULT 'private'::public.visibility NOT NULL,
    section_visibility jsonb DEFAULT '{}'::jsonb NOT NULL,
    phone character varying(50),
    whatsapp character varying(50),
    email character varying(255),
    location character varying(255),
    show_phone boolean DEFAULT false NOT NULL,
    show_whatsapp boolean DEFAULT false NOT NULL,
    show_email boolean DEFAULT false NOT NULL,
    show_location boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.businesses OWNER TO ibrahim_kimaro;

--
-- Name: chat_messages; Type: TABLE; Schema: public; Owner: ibrahim_kimaro
--

CREATE TABLE public.chat_messages (
    id bigint NOT NULL,
    client_id character varying(64) NOT NULL,
    topic character varying(200) NOT NULL,
    author_id uuid NOT NULL,
    author_name character varying(255) NOT NULL,
    author_username character varying(50) NOT NULL,
    body text NOT NULL,
    reply_to jsonb,
    inserted_at timestamp with time zone DEFAULT now() NOT NULL,
    recipient_id uuid,
    read_at timestamp with time zone
);


ALTER TABLE public.chat_messages OWNER TO ibrahim_kimaro;

--
-- Name: chat_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: ibrahim_kimaro
--

CREATE SEQUENCE public.chat_messages_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.chat_messages_id_seq OWNER TO ibrahim_kimaro;

--
-- Name: chat_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: ibrahim_kimaro
--

ALTER SEQUENCE public.chat_messages_id_seq OWNED BY public.chat_messages.id;


--
-- Name: follows; Type: TABLE; Schema: public; Owner: ibrahim_kimaro
--

CREATE TABLE public.follows (
    id uuid NOT NULL,
    follower_id uuid NOT NULL,
    user_id uuid,
    business_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.follows OWNER TO ibrahim_kimaro;

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: ibrahim_kimaro
--

CREATE TABLE public.notifications (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    kind character varying(30) NOT NULL,
    title character varying(160) NOT NULL,
    body text,
    link character varying(300),
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.notifications OWNER TO ibrahim_kimaro;

--
-- Name: onboarding_answers; Type: TABLE; Schema: public; Owner: ibrahim_kimaro
--

CREATE TABLE public.onboarding_answers (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    question_key character varying(60) NOT NULL,
    answer jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.onboarding_answers OWNER TO ibrahim_kimaro;

--
-- Name: onboarding_categories; Type: TABLE; Schema: public; Owner: ibrahim_kimaro
--

CREATE TABLE public.onboarding_categories (
    key character varying(40) NOT NULL,
    label character varying(80) NOT NULL,
    sort integer DEFAULT 0 NOT NULL,
    active boolean DEFAULT true NOT NULL
);


ALTER TABLE public.onboarding_categories OWNER TO ibrahim_kimaro;

--
-- Name: onboarding_questions; Type: TABLE; Schema: public; Owner: ibrahim_kimaro
--

CREATE TABLE public.onboarding_questions (
    id uuid NOT NULL,
    prompt character varying(200) NOT NULL,
    help character varying(300),
    kind character varying(10) NOT NULL,
    options jsonb DEFAULT '[]'::jsonb NOT NULL,
    required boolean DEFAULT false NOT NULL,
    sort integer DEFAULT 0 NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.onboarding_questions OWNER TO ibrahim_kimaro;

--
-- Name: onboarding_roles; Type: TABLE; Schema: public; Owner: ibrahim_kimaro
--

CREATE TABLE public.onboarding_roles (
    key character varying(60) NOT NULL,
    label character varying(100) NOT NULL,
    category_key character varying(40) NOT NULL,
    template character varying(50) NOT NULL,
    example_title character varying(200) NOT NULL,
    example_skills character varying(200) NOT NULL,
    evidence_hint character varying(200) NOT NULL,
    sort integer DEFAULT 0 NOT NULL,
    active boolean DEFAULT true NOT NULL
);


ALTER TABLE public.onboarding_roles OWNER TO ibrahim_kimaro;

--
-- Name: otp_logs; Type: TABLE; Schema: public; Owner: ibrahim_kimaro
--

CREATE TABLE public.otp_logs (
    id uuid NOT NULL,
    user_id uuid,
    destination character varying(255) NOT NULL,
    channel character varying(20) NOT NULL,
    code character varying(10) NOT NULL,
    purpose character varying(50) NOT NULL,
    is_verified boolean NOT NULL,
    delivery_status character varying(50) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    verified_at timestamp with time zone
);


ALTER TABLE public.otp_logs OWNER TO ibrahim_kimaro;

--
-- Name: platform_settings; Type: TABLE; Schema: public; Owner: ibrahim_kimaro
--

CREATE TABLE public.platform_settings (
    key character varying(60) NOT NULL,
    value jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.platform_settings OWNER TO ibrahim_kimaro;

--
-- Name: profiles; Type: TABLE; Schema: public; Owner: ibrahim_kimaro
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    username character varying(50) NOT NULL,
    display_name character varying(150) NOT NULL,
    bio text,
    avatar_url character varying(500),
    visibility public.visibility DEFAULT 'public'::public.visibility NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    headline character varying(160),
    portfolio jsonb DEFAULT '{}'::jsonb NOT NULL,
    allow_indexing boolean DEFAULT true NOT NULL
);


ALTER TABLE public.profiles OWNER TO ibrahim_kimaro;

--
-- Name: roles; Type: TABLE; Schema: public; Owner: ibrahim_kimaro
--

CREATE TABLE public.roles (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    business_id uuid,
    organization_name character varying(150),
    title character varying(100) NOT NULL,
    start_date date,
    end_date date,
    visibility public.visibility DEFAULT 'public'::public.visibility NOT NULL,
    trust character varying(20) NOT NULL,
    hidden_by_business boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.roles OWNER TO ibrahim_kimaro;

--
-- Name: security_events; Type: TABLE; Schema: public; Owner: ibrahim_kimaro
--

CREATE TABLE public.security_events (
    id uuid NOT NULL,
    kind character varying(30) NOT NULL,
    ip character varying(64),
    user_id uuid,
    email character varying(255),
    user_agent character varying(300),
    details jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.security_events OWNER TO ibrahim_kimaro;

--
-- Name: sessions; Type: TABLE; Schema: public; Owner: ibrahim_kimaro
--

CREATE TABLE public.sessions (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    token_hash character varying(64) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    user_agent character varying(300),
    ip character varying(64),
    last_seen_at timestamp with time zone
);


ALTER TABLE public.sessions OWNER TO ibrahim_kimaro;

--
-- Name: uploads; Type: TABLE; Schema: public; Owner: ibrahim_kimaro
--

CREATE TABLE public.uploads (
    name character varying(64) NOT NULL,
    owner_id uuid NOT NULL,
    content_type character varying(100) NOT NULL,
    is_public boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.uploads OWNER TO ibrahim_kimaro;

--
-- Name: users; Type: TABLE; Schema: public; Owner: ibrahim_kimaro
--

CREATE TABLE public.users (
    id uuid NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    is_active boolean NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    fullname character varying(255) NOT NULL,
    username character varying(50) NOT NULL,
    phone_number character varying(50),
    is_admin boolean NOT NULL,
    preferences jsonb DEFAULT '{}'::jsonb NOT NULL,
    otp_pending boolean DEFAULT false NOT NULL
);


ALTER TABLE public.users OWNER TO ibrahim_kimaro;

--
-- Name: watches; Type: TABLE; Schema: public; Owner: ibrahim_kimaro
--

CREATE TABLE public.watches (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    work_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.watches OWNER TO ibrahim_kimaro;

--
-- Name: work_events; Type: TABLE; Schema: public; Owner: ibrahim_kimaro
--

CREATE TABLE public.work_events (
    id uuid NOT NULL,
    work_id uuid NOT NULL,
    user_id uuid NOT NULL,
    field character varying(30) NOT NULL,
    old_value character varying(50),
    new_value character varying(50),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.work_events OWNER TO ibrahim_kimaro;

--
-- Name: work_items; Type: TABLE; Schema: public; Owner: ibrahim_kimaro
--

CREATE TABLE public.work_items (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    title character varying(200) NOT NULL,
    description text,
    context_role character varying(200),
    occurred_on date,
    work_type character varying(50) NOT NULL,
    status character varying(30) DEFAULT 'captured'::character varying NOT NULL,
    visibility public.visibility DEFAULT 'public'::public.visibility NOT NULL,
    skills jsonb DEFAULT '[]'::jsonb NOT NULL,
    custom_attributes json DEFAULT '{}'::json NOT NULL,
    evidence_links jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    template character varying(50),
    source_id uuid
);


ALTER TABLE public.work_items OWNER TO ibrahim_kimaro;

--
-- Name: work_templates; Type: TABLE; Schema: public; Owner: ibrahim_kimaro
--

CREATE TABLE public.work_templates (
    key character varying(50) NOT NULL,
    kind character varying(20) NOT NULL,
    label character varying(80) NOT NULL,
    description character varying(200),
    fields jsonb DEFAULT '[]'::jsonb NOT NULL,
    sort integer DEFAULT 0 NOT NULL,
    active boolean DEFAULT true NOT NULL
);


ALTER TABLE public.work_templates OWNER TO ibrahim_kimaro;

--
-- Name: chat_messages id; Type: DEFAULT; Schema: public; Owner: ibrahim_kimaro
--

ALTER TABLE ONLY public.chat_messages ALTER COLUMN id SET DEFAULT nextval('public.chat_messages_id_seq'::regclass);


--
-- Data for Name: admin_actions; Type: TABLE DATA; Schema: public; Owner: ibrahim_kimaro
--

COPY public.admin_actions (id, admin_id, action, target, details, created_at) FROM stdin;
0bb3c977-eed5-4619-b1ee-b5fd4ed6914a	b816fcfb-f11a-4027-b728-a687322fe844	onboarding.question.create	e39c3dc9-aaf3-46f1-83b0-62b081b6607d	{"prompt": "What brings you to Home Proofolio?"}	2026-10-01 07:03:00.857735-04
5ebf7fbf-cd46-4497-9106-68a7890d127c	b816fcfb-f11a-4027-b728-a687322fe844	onboarding.category.create	farming	{"label": "Farming & Agriculture"}	2026-10-01 07:03:01.590268-04
d208179c-6548-4cc2-9148-6174726144f6	b816fcfb-f11a-4027-b728-a687322fe844	onboarding.role.create	farmer	{"label": "Farmer"}	2026-10-01 07:03:01.813859-04
7d9cb352-43d3-4801-b107-d41b9c4b22bb	b816fcfb-f11a-4027-b728-a687322fe844	onboarding.steps.update	\N	{"enabled": {"work": true, "account": true, "evidence": false, "questions": true, "appearance": true, "discipline": true}}	2026-10-01 07:03:02.052663-04
0cfa7986-bb73-45f9-92ab-7bf084572674	b816fcfb-f11a-4027-b728-a687322fe844	template.create	farming	{"label": "Farming"}	2026-10-01 07:03:02.455323-04
5f6efe67-b2e8-4b9a-b5b6-6a6c877ad599	b816fcfb-f11a-4027-b728-a687322fe844	platform.announcement	\N	{"text": "Welcome to the beta! Share your profile link to invite friends.", "active": true}	2026-10-01 07:03:02.680981-04
57908b8a-9950-4531-a472-86549f8d6af5	b816fcfb-f11a-4027-b728-a687322fe844	platform.registration	\N	{"open": false}	2026-10-01 07:03:03.132467-04
aefb6eaa-b7bf-4111-984c-a682ff84297f	b816fcfb-f11a-4027-b728-a687322fe844	platform.registration	\N	{"open": true}	2026-10-01 07:03:03.482964-04
97db7669-2798-49c8-82a6-8be6a93a8e89	b816fcfb-f11a-4027-b728-a687322fe844	onboarding.steps.update	\N	{"enabled": {"work": true, "account": true, "evidence": true, "questions": true, "appearance": true, "discipline": true}}	2026-10-01 07:03:59.684003-04
49d32105-3d5d-49e5-96f5-78d85b07bc26	b816fcfb-f11a-4027-b728-a687322fe844	user.delete	juma-farmer	{"email": "farm150120@test.io"}	2026-10-01 07:15:41.842919-04
154eaf55-32f2-4a8b-8b45-e38d8badc642	b816fcfb-f11a-4027-b728-a687322fe844	user.delete	onbq31913	{"email": "onbq31913@test.io"}	2026-10-01 07:15:41.899212-04
40004ce4-8b3b-497d-8d2d-64cc2ad43f6b	b816fcfb-f11a-4027-b728-a687322fe844	onboarding.question.delete	e39c3dc9-aaf3-46f1-83b0-62b081b6607d	{"prompt": "What brings you to Home Proofolio?"}	2026-10-01 07:15:41.933426-04
46d9eb30-3ab0-4d5d-8d9e-54092cd86060	b816fcfb-f11a-4027-b728-a687322fe844	onboarding.role.delete	farmer	{"label": "Farmer"}	2026-10-01 07:15:41.974431-04
7b1925e6-575c-4b1c-9cde-2998218c10ae	b816fcfb-f11a-4027-b728-a687322fe844	onboarding.category.delete	farming	{}	2026-10-01 07:15:42.032335-04
e88d9eb6-b99f-41f8-9894-3b843341b69c	b816fcfb-f11a-4027-b728-a687322fe844	template.delete	farming	{}	2026-10-01 07:15:42.097307-04
dfecae98-63fe-4aae-a1a8-ce940aada8fd	b816fcfb-f11a-4027-b728-a687322fe844	platform.announcement	\N	{"text": "", "active": false}	2026-10-01 07:15:42.132819-04
84b0ec7c-fd28-4d6f-9445-5e3a9ebe0518	b816fcfb-f11a-4027-b728-a687322fe844	user.update	bud48983	{"is_active": true}	2026-10-01 07:15:53.009067-04
731da984-b030-40f5-bcc8-5cdbbe2db7aa	b816fcfb-f11a-4027-b728-a687322fe844	work.moderate	e35a5fd8-5184-4ceb-ab17-d0dfca28931c	{"title": "Member work", "visibility": "private"}	2026-10-01 07:15:53.049142-04
7526aa5d-f9f7-492b-9ae5-3652c6d929aa	b816fcfb-f11a-4027-b728-a687322fe844	work.delete	e35a5fd8-5184-4ceb-ab17-d0dfca28931c	{"owner": "bud48983", "title": "Member work"}	2026-10-01 07:15:53.077879-04
e6a364f1-0f2a-4c7e-b9cc-b1f8ce02e321	b816fcfb-f11a-4027-b728-a687322fe844	user.delete	bud48983	{"email": "bud48983@test.io"}	2026-10-01 07:15:53.426088-04
\.


--
-- Data for Name: alembic_version; Type: TABLE DATA; Schema: public; Owner: ibrahim_kimaro
--

COPY public.alembic_version (version_num) FROM stdin;
e7a3c5d9f1b4
\.


--
-- Data for Name: blocked_ips; Type: TABLE DATA; Schema: public; Owner: ibrahim_kimaro
--

COPY public.blocked_ips (ip, reason, blocked_by, expires_at, created_at) FROM stdin;
\.


--
-- Data for Name: broadcasts; Type: TABLE DATA; Schema: public; Owner: ibrahim_kimaro
--

COPY public.broadcasts (id, admin_id, channel, segment, subject, body, recipients, delivery, created_at) FROM stdin;
\.


--
-- Data for Name: business_members; Type: TABLE DATA; Schema: public; Owner: ibrahim_kimaro
--

COPY public.business_members (business_id, user_id, permission, created_at) FROM stdin;
\.


--
-- Data for Name: business_offerings; Type: TABLE DATA; Schema: public; Owner: ibrahim_kimaro
--

COPY public.business_offerings (id, business_id, kind, name, description, price, sort) FROM stdin;
\.


--
-- Data for Name: business_work_links; Type: TABLE DATA; Schema: public; Owner: ibrahim_kimaro
--

COPY public.business_work_links (id, business_id, work_id, status, created_at) FROM stdin;
\.


--
-- Data for Name: businesses; Type: TABLE DATA; Schema: public; Owner: ibrahim_kimaro
--

COPY public.businesses (id, slug, name, type, description, visibility, section_visibility, phone, whatsapp, email, location, show_phone, show_whatsapp, show_email, show_location, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: chat_messages; Type: TABLE DATA; Schema: public; Owner: ibrahim_kimaro
--

COPY public.chat_messages (id, client_id, topic, author_id, author_name, author_username, body, reply_to, inserted_at, recipient_id, read_at) FROM stdin;
\.


--
-- Data for Name: follows; Type: TABLE DATA; Schema: public; Owner: ibrahim_kimaro
--

COPY public.follows (id, follower_id, user_id, business_id, created_at) FROM stdin;
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: ibrahim_kimaro
--

COPY public.notifications (id, user_id, kind, title, body, link, read_at, created_at) FROM stdin;
\.


--
-- Data for Name: onboarding_answers; Type: TABLE DATA; Schema: public; Owner: ibrahim_kimaro
--

COPY public.onboarding_answers (id, user_id, question_key, answer, created_at) FROM stdin;
\.


--
-- Data for Name: onboarding_categories; Type: TABLE DATA; Schema: public; Owner: ibrahim_kimaro
--

COPY public.onboarding_categories (key, label, sort, active) FROM stdin;
tech	Tech & Engineering	0	t
business	Business & Finance	10	t
science	Science & Education	20	t
creative	Design & Media	30	t
health	Healthcare & Impact	40	t
athletics	Sports & Athletics	50	t
trades	Operations & Trades	60	t
\.


--
-- Data for Name: onboarding_questions; Type: TABLE DATA; Schema: public; Owner: ibrahim_kimaro
--

COPY public.onboarding_questions (id, prompt, help, kind, options, required, sort, active, created_at) FROM stdin;
\.


--
-- Data for Name: onboarding_roles; Type: TABLE DATA; Schema: public; Owner: ibrahim_kimaro
--

COPY public.onboarding_roles (key, label, category_key, template, example_title, example_skills, evidence_hint, sort, active) FROM stdin;
developer	Software Developer	tech	developer	Engineered offline-first sync queue for clinic records	TypeScript, React, SQLite	A GitHub repository, PR diff, or live URL	0	t
backend-dev	Backend & API Engineer	tech	developer	Architected high-throughput payment webhook processor	Go, PostgreSQL, Redis, Docker	A repository link, API doc, or benchmark	10	t
mobile-dev	Mobile Developer	tech	developer	Shipped bilingual Android app with low-bandwidth mode	Flutter, Dart, Firebase, Kotlin	Play Store link or GitHub repo	20	t
devops-cloud	DevOps & Cloud Engineer	tech	developer	Automated multi-region CI/CD deployment with 99.9% uptime	Kubernetes, Terraform, AWS, Linux	Infrastructure config repo or uptime audit report	30	t
ai-ml	AI & Machine Learning	tech	research	Fine-tuned Swahili LLM for agricultural disease diagnosis	Python, PyTorch, HuggingFace, NLP	Model repo, notebook, or evaluation benchmark	40	t
cybersecurity	Cybersecurity Analyst	tech	developer	Conducted vulnerability assessment on banking API gateway	Penetration Testing, OWASP, Wireshark, ISO 27001	Redacted audit report or CVE submission link	50	t
hardware-eng	Hardware / Embedded Engineer	tech	developer	Designed solar microgrid controller PCB and firmware	C++, ESP32, KiCAD, IoT Telemetry	Schematic files or circuit photos	60	t
accountant	Accountant & Auditor	business	business	Conducted statutory audit reconciliation for 14,000 transactions	Financial Accounting, Tax Audit, Excel, IFRS	Verified audit sign-off or credential letter	70	t
founder	Founder & Entrepreneur	business	business	Founded community retail hub and scaled to 450 recurring clients	Business Operations, Financial Modeling, Hiring	Commercial registration or traction dashboard	80	t
product-manager	Product Manager	business	business	Led discovery and launch of mobile wallet integration	Product Strategy, User Research, Roadmapping	Product brief, Figma wireframe, or launch post	90	t
financial-analyst	Financial Analyst	business	business	Built discounted cash flow valuation model for solar farm expansion	Valuation, DCF Modeling, Python for Finance	Financial model worksheet or executive deck	100	t
legal-compliance	Legal & Compliance	business	business	Drafted data privacy and cross-border vendor agreement policy	Contract Law, Regulatory Compliance, GDPR	Redacted legal memo or published policy	110	t
marketing-growth	Marketing & Growth	business	business	Grew organic developer signups by 180% via educational content	SEO, Performance Marketing, Content Strategy	Analytics screenshot or campaign case study	120	t
student	Student & Apprentice	science	young_learner	Built automated study planner for university degree capstone	Academic Research, Presentation, Critical Thinking	Capstone project file, diploma, or science fair certificate	130	t
researcher	Academic Researcher	science	research	Published empirical study on regional water management	Statistical Analysis, Methodology, Peer Review	DOI link, preprint paper, or research dataset	140	t
data-scientist	Data Scientist	science	research	Analyzed demographic transit patterns across coastal metro routes	Pandas, SQL, Scikit-Learn, Data Storytelling	Jupyter notebook or interactive visualization link	150	t
educator	Educator & Teacher	science	young_learner	Authored interactive STEM curriculum adopted by 8 secondary schools	Curriculum Design, Pedagogy, Mentorship	Lesson plans, workshop slides, or student results summary	160	t
environmental	Environmental Scientist	science	research	Monitored coastal mangrove biodiversity and carbon sequestration	GIS Mapping, Remote Sensing, Field Sampling	GIS map export, field study log, or lab report	170	t
designer	UI/UX & Product Designer	creative	designer	Designed cross-platform financial dashboard with accessible tokens	Figma, Design Systems, Usability Testing	Figma community file, case study, or live app preview	180	t
brand-designer	Brand & Graphic Designer	creative	designer	Created visual identity and packaging system for organic coffee brand	Illustrator, Typography, Packaging Design	Brand guidelines PDF or Behance link	190	t
writer	Writer & Journalist	creative	young_learner	Wrote investigative series on local renewable microgrid financing	Investigative Journalism, Copywriting, Editing	Published article link or portfolio clipping	200	t
videographer	Videographer & Media Creator	creative	designer	Directed documentary feature on rural youth tech literacy	Cinematography, Color Grading, Video Editing	Vimeo / YouTube link or festival selection certificate	210	t
architect	Architect & Spatial Designer	creative	designer	Designed passive cooling community library blueprint	AutoCAD, BIM, 3D Rendering, Sustainable Architecture	Architectural drawings or 3D renders	220	t
doctor	Doctor & Clinical Officer	health	business	Streamlined maternal triage protocols, reducing wait times by 35%	Clinical Diagnosis, Emergency Triage, Public Health	Institutional credential or clinical case summary	230	t
pharmacist	Pharmacist	health	business	Digitized pharmaceutical cold-chain temperature verification	Pharmacology, Inventory Logistics, Regulatory Standards	Board licensing certificate or operational audit	240	t
ngo-leader	NGO & Community Leader	health	business	Managed clean water distribution initiative benefiting 3,200 households	Grant Administration, Community Mobilization, Impact M&E	Donor impact report or field project audit	250	t
athlete	Footballer & Athlete	athletics	sports	Completed season as central midfielder with 8 assists and 92% pass accuracy	Tactical Awareness, Stamina, Leadership	Match video highlights or official league score sheet	260	t
coach	Coach & Sports Trainer	athletics	sports	Trained U-17 regional academy team to tournament championship	Tactical Planning, Player Development, Conditioning	Coaching badge or tournament tournament sheet	270	t
supply-chain	Supply Chain & Logistics	trades	business	Optimized regional freight dispatch, saving 22% in fuel expenditures	Logistics Optimization, Fleet Management, ERP Systems	Dispatch audit or warehouse operational metric	280	t
agriculture	Agriculturalist & Producer	trades	business	Implemented drip-irrigation system yielding 40% higher grain output	Agronomy, Irrigation Engineering, Crop Yield Analysis	Soil audit, harvest yield records, or farm photos	290	t
technician	Electrical / Mechanical Tech	trades	developer	Overhauled commercial backup diesel generator and switchgear	Circuit Diagnostics, Preventive Maintenance, Power Systems	Maintenance sign-off or certification license	300	t
other	General / Multidisciplinary	trades	other	Solved complex cross-functional challenge with verified outcome	Problem Solving, Initiative, Documentation	Any document, screenshot, or supervisor reference	310	t
\.


--
-- Data for Name: otp_logs; Type: TABLE DATA; Schema: public; Owner: ibrahim_kimaro
--

COPY public.otp_logs (id, user_id, destination, channel, code, purpose, is_verified, delivery_status, expires_at, created_at, verified_at) FROM stdin;
40b86239-94a1-4b49-afa1-1e5b56f62f92	\N	+255712345678	phone	340089	registration	t	simulated_sent	2026-09-30 07:23:36.74004-04	2026-09-30 07:13:36.741965-04	2026-09-30 07:15:02.907882-04
79196278-f759-43bd-95a7-96968f281ec7	\N	+255789123456	phone	839901	registration	t	simulated_sent	2026-09-30 07:36:26.423836-04	2026-09-30 07:26:26.426207-04	2026-09-30 07:26:26.456226-04
b51ae10f-ca4b-4f72-8b63-00d4f7a2178f	\N	+255 712 345 678	phone	431005	registration	f	simulated_sent	2026-09-30 08:48:36.002678-04	2026-09-30 08:38:36.000225-04	\N
64d64c61-aac2-4101-8953-9c72ac5eef45	\N	+255 712 345 678	email	900766	registration	f	simulated_sent	2026-09-30 08:49:20.961523-04	2026-09-30 08:39:20.959199-04	\N
67b15e0a-8c86-44e6-a60a-230939475cac	\N	+255628726374	phone	869368	registration	f	simulated_sent	2026-09-30 10:25:33.836911-04	2026-09-30 10:15:33.838107-04	\N
dbbd6858-d863-45fe-9518-7469c8f12ded	\N	+255700000001	phone	870304	registration	f	simulated_sent	2026-10-01 06:14:15.145246-04	2026-10-01 06:04:15.146246-04	\N
45a0fc83-24aa-4df0-9ce3-1b2073634e7d	\N	+255700000003	phone	304352	admin_test	f	simulated_sent	2026-10-01 06:14:21.9472-04	2026-10-01 06:04:21.935854-04	\N
84a2def5-cf6f-41bf-bfcd-b23fc3d2312f	\N	+255700000001	phone	324029	registration	f	simulated_sent	2026-10-01 07:25:48.962709-04	2026-10-01 07:15:48.963701-04	\N
2562ee53-7e9a-4bb1-a576-7fa845c85ed9	\N	+255700000003	phone	762048	admin_test	f	simulated_sent	2026-10-01 07:25:52.980311-04	2026-10-01 07:15:52.978849-04	\N
\.


--
-- Data for Name: platform_settings; Type: TABLE DATA; Schema: public; Owner: ibrahim_kimaro
--

COPY public.platform_settings (key, value, updated_at) FROM stdin;
registration	{"open": true, "closed_message": ""}	2026-10-01 07:03:03.482964-04
onboarding	{"work": {"title": "Here's your first entry.", "enabled": true, "subtitle": "We filled it in from your discipline. Make it yours."}, "account": {"title": "Keep what you built", "enabled": true, "subtitle": "Create your account to save it.", "phone_enabled": true}, "evidence": {"title": "Where's the proof?", "enabled": true, "subtitle": "A link people can open. You can add files later."}, "questions": {"title": "A few quick questions", "enabled": true, "subtitle": "This helps us shape Home Proofolio for you."}, "appearance": {"title": "Personalize your appearance", "enabled": true, "subtitle": "You can change this anytime in Settings."}, "discipline": {"title": "What kind of work do you do?", "enabled": true, "subtitle": "Pick your primary discipline. You can add more roles later."}}	2026-10-01 07:03:59.684003-04
announcement	{"link": null, "text": "", "tone": "info", "active": false}	2026-10-01 07:15:42.132819-04
\.


--
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: ibrahim_kimaro
--

COPY public.profiles (id, user_id, username, display_name, bio, avatar_url, visibility, created_at, updated_at, headline, portfolio, allow_indexing) FROM stdin;
1b5384d8-50fd-47e4-a91d-65c6d506a256	0442e5cd-e4b7-449d-ae56-8bac0028b958	therealkimmy	Ibrahim issa Kimaro	Building **HOME PROOFOLIO** — a universal platform for people to document what they learn, build, solve, and prove.\nThe interesting part?  ,one system that adapts to developers, students, designers, entrepreneurs, athletes, and professionals without forcing everyone into the same structure.\nStill building. Still learning. Still proving.	/files/c7f1c1bc8b574e4384563b3dfd0a928b.jpg	public	2026-09-30 10:15:33.531282-04	2026-10-01 06:50:38.939687-04	cyber security and software developer	{"roles": [], "tagline": null, "featured": [], "sections": ["works", "about", "experience", "contact"], "show_metrics": true, "contact_email": null}	t
22bc0bc1-32b1-48c6-9083-8a8913e4df6b	6850fa8a-1264-4775-b056-a9f6d46edcd1	kimmy	Kimmy Pro	\N	\N	public	2026-09-30 07:22:14.65342-04	2026-09-30 07:22:14.65342-04	\N	{}	t
0dbf54bf-a8e8-47fc-9b36-384fb30590c7	b816fcfb-f11a-4027-b728-a687322fe844	home_proofolio	Home Proofolio	\N	\N	public	2026-09-30 07:51:23.871951-04	2026-09-30 07:51:23.871951-04	\N	{}	t
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: ibrahim_kimaro
--

COPY public.roles (id, user_id, business_id, organization_name, title, start_date, end_date, visibility, trust, hidden_by_business, created_at) FROM stdin;
685ac9c0-78e5-4f81-b2b4-d9649834fd04	0442e5cd-e4b7-449d-ae56-8bac0028b958	\N	institute of finanace managemet(IFM)	student	2024-11-18	2027-08-13	public	self_declared	f	2026-10-01 06:44:39.968126-04
\.


--
-- Data for Name: security_events; Type: TABLE DATA; Schema: public; Owner: ibrahim_kimaro
--

COPY public.security_events (id, kind, ip, user_id, email, user_agent, details, created_at) FROM stdin;
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: ibrahim_kimaro
--

COPY public.sessions (id, user_id, token_hash, expires_at, created_at, user_agent, ip, last_seen_at) FROM stdin;
0a92f123-3c30-4a4c-a7d1-114a559b7d69	0442e5cd-e4b7-449d-ae56-8bac0028b958	6d0f96cf5160b2691876006589a408861b3f000cc643a9f564e87ba19e55618c	2026-10-31 05:08:03.833983-04	2026-10-01 05:08:03.638036-04	Mozilla/5.0 (iPhone; CPU iPhone OS 27_0_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/154.0.8037.55 Mobile/15E148 Safari/604.1	\N	\N
375a8f02-5912-499e-a061-a82b906cc351	b816fcfb-f11a-4027-b728-a687322fe844	aca4175f79946a232666ba76b03e65614c729dd553bc595743f2dd0703ed6258	2026-10-31 05:21:42.713737-04	2026-10-01 05:21:42.518484-04	curl/8.21.0	\N	\N
8e34f0da-d54e-4995-8926-70ee75e58ca2	b816fcfb-f11a-4027-b728-a687322fe844	d01c328ff054ae860beae6d270e5525d88f9f6ecfa2eb07289e34f0ceea5974f	2026-10-31 05:34:29.521458-04	2026-10-01 05:34:29.325318-04	curl/8.21.0	\N	\N
5e8511b2-4248-4a94-8947-29d96130ce85	b816fcfb-f11a-4027-b728-a687322fe844	0e8fa0dfed641dea3bd189765d5a6db8530ef95d071d212068b5a1b3d33a5213	2026-10-31 06:04:21.812642-04	2026-10-01 06:04:21.615362-04	Python-urllib/3.14	\N	\N
d43f17d9-fbbd-48fd-acaa-0f9276a0ed9c	6850fa8a-1264-4775-b056-a9f6d46edcd1	379804ad3fef1cecb3f75f8357a019d2e6e94793e699b611633565b17398c9b9	2026-10-30 07:22:14.955154-04	2026-09-30 07:22:14.949605-04	\N	\N	\N
3c89f465-479c-49e4-b4de-f213f97d095d	b816fcfb-f11a-4027-b728-a687322fe844	42585d10e0eea0759cf16521311473e668708c02c63ff76e004b2eac0cb1e750	2026-10-31 06:04:35.061087-04	2026-10-01 06:04:34.862474-04	curl/8.21.0	\N	\N
f6a79a9f-850c-4079-ba0d-d116feaf3b8e	b816fcfb-f11a-4027-b728-a687322fe844	0b2bd631119317a2caf36da38a433024d3d3d0c05fe124062e84c56d891ec4c4	2026-10-31 06:07:25.997714-04	2026-10-01 06:07:25.801875-04	curl/8.21.0	\N	\N
ac11d531-0fb3-49e9-927b-50f29c815168	b816fcfb-f11a-4027-b728-a687322fe844	140627e11e85c18c669b0631feb124d5d81e7e5a3fdeaaa139cb86b9b6e6c7a1	2026-10-31 07:03:00.57886-04	2026-10-01 07:03:00.375518-04	curl/8.21.0	\N	\N
dcf47ba6-344e-41c0-bbfd-179e496cb234	b816fcfb-f11a-4027-b728-a687322fe844	752196e8c80fdeeb7f645d45c078474ae8b81cefaf703c4ee54c159c57706c8c	2026-10-31 07:12:42.479113-04	2026-10-01 07:12:42.283353-04	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/153.0.0.0 Safari/537.36	\N	\N
c8c77163-f89c-4d71-bdc5-6d92fff614b3	b816fcfb-f11a-4027-b728-a687322fe844	b01ba88bf7dfe02dd5da6125e0639acd49cd29d7b13e78834eaa55f158ee6b52	2026-10-31 07:13:18.030803-04	2026-10-01 07:13:17.818653-04	curl/8.21.0	\N	\N
9fe372c3-38b2-4831-b041-99400c7cec83	b816fcfb-f11a-4027-b728-a687322fe844	0c9d7a9d7c00a9938567fa8761642fb5c6a9b4f4c4ca0c3bba5003ca83ae8699	2026-10-30 07:51:45.466219-04	2026-09-30 07:51:45.252571-04	\N	\N	\N
bb54f61c-fb67-4b4e-bb7e-ce5e98d0c205	b816fcfb-f11a-4027-b728-a687322fe844	970c66cb416a77adfbf6a7a4cb03dfc6cf179812a49aa5067c5cf6197fee4784	2026-10-30 07:53:17.951715-04	2026-09-30 07:53:17.755748-04	\N	\N	\N
61da674d-039a-429b-8b70-8ba6e05346f0	b816fcfb-f11a-4027-b728-a687322fe844	13f68c62ebcaefd9192cbb71eac1b00f322e1090a7c681ca58cb99f18905f67e	2026-10-30 08:09:02.632183-04	2026-09-30 08:09:02.435594-04	\N	\N	\N
c3f2df52-6d7f-4062-9d93-54835ef1a860	b816fcfb-f11a-4027-b728-a687322fe844	b0ba1c8b193fab4678a28bc4750179194de055fa8ea9a4972ef2cdc74c8d6bd3	2026-10-30 08:09:19.285141-04	2026-09-30 08:09:19.088011-04	\N	\N	\N
933c5df7-cac6-44c4-b5cf-1512439c76aa	b816fcfb-f11a-4027-b728-a687322fe844	493849f568c46229adfb7f08daa03313fff3a2df2acb472a5ec98235467ba823	2026-10-30 08:30:30.043433-04	2026-09-30 08:30:29.838667-04	\N	\N	\N
481b8019-ad76-46be-a743-f37639055b6d	b816fcfb-f11a-4027-b728-a687322fe844	d750f10651302808271e88ac4818afc7a085a7313461b90e1b528aea92122dee	2026-10-31 07:14:25.608896-04	2026-10-01 07:14:25.41348-04	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/153.0.0.0 Safari/537.36	\N	\N
ab0b849c-4cda-437f-8845-f8c3c9a55eea	b816fcfb-f11a-4027-b728-a687322fe844	55e1ae3e82da8b6912015adc64037d1be582aac468d6f07fb82131f44a901d1b	2026-10-30 08:38:53.308744-04	2026-09-30 08:38:53.112735-04	\N	\N	\N
27019e1c-6283-4be5-857e-04f57561c877	b816fcfb-f11a-4027-b728-a687322fe844	d19413f00152205fe2707e704dfd94c71a72b70801a139b0cb7ecdd67a0a52b7	2026-10-31 07:14:48.806691-04	2026-10-01 07:14:48.611578-04	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/153.0.0.0 Safari/537.36	\N	\N
8d9e2431-3020-49e4-9df9-caf14bcebf7d	b816fcfb-f11a-4027-b728-a687322fe844	e539d1ff6f84d84ec4f82228dbe6210b0d5e6983fae008f2c92d2dcec01b0e0c	2026-10-30 08:40:58.630489-04	2026-09-30 08:40:58.415701-04	\N	\N	\N
84a8e9ba-7c09-412b-86f7-4ef99a67d84e	b816fcfb-f11a-4027-b728-a687322fe844	f2b3af8612fd7ca84e7f82943b6f5a0160d8bc958a80ae7d9dc88327c4d4e454	2026-10-30 08:45:53.838007-04	2026-09-30 08:45:53.642742-04	\N	\N	\N
7ac78f9f-7a20-4826-a96d-a7a16c88cae0	b816fcfb-f11a-4027-b728-a687322fe844	12d3048c635aad2b6a7de5b18b32707e192384a6491815a638decd812b46ea23	2026-10-30 08:46:52.275469-04	2026-09-30 08:46:52.079144-04	\N	\N	\N
17ac3347-6dfc-41d4-8451-a9095f7c7ea6	b816fcfb-f11a-4027-b728-a687322fe844	9cf52ffa27b878f0e48f26558f1fc6cc01a4467a8210149b7fd909d2266da903	2026-10-30 08:47:15.098017-04	2026-09-30 08:47:14.901947-04	\N	\N	\N
4e80f584-8246-4a7c-8484-ca5d7fb85e11	b816fcfb-f11a-4027-b728-a687322fe844	7ff1cf26a5fa3e46ac194194873d1d5f84dd16a200464d4159ffc76a23f4dd29	2026-10-30 08:54:04.675261-04	2026-09-30 08:54:04.480085-04	\N	\N	\N
290e5aa4-0855-4099-961f-6bb88791c0bf	b816fcfb-f11a-4027-b728-a687322fe844	8d554bf7dd05d16505bc82ff1b5e3e6b192d5b0162deeb98efd644288a834c34	2026-10-30 09:18:02.062164-04	2026-09-30 09:18:01.858937-04	\N	\N	\N
4f34fdbc-513d-426c-9de9-526c8e219919	b816fcfb-f11a-4027-b728-a687322fe844	b3d11b6dba935dddde9314f9ab716a7f71e4321257f14f04a859110d51ce81f7	2026-10-31 07:15:41.785448-04	2026-10-01 07:15:41.591052-04	curl/8.21.0	\N	\N
c20d6fef-faad-4efb-a1dd-cd26523d2487	b816fcfb-f11a-4027-b728-a687322fe844	53d57478fa92b8af1034917754d7b1a3925ea11e0c6f91c33e46f2b2ce77c778	2026-10-30 09:23:52.454094-04	2026-09-30 09:23:52.259295-04	\N	\N	\N
577dd617-0dac-456b-b84d-cf19f1eef504	0442e5cd-e4b7-449d-ae56-8bac0028b958	6ab3b7ece629ccd6924940e3572d6bbaeaf585d7d499ef495c07b27d444ebf51	2026-10-30 10:15:33.821758-04	2026-09-30 10:15:33.820647-04	\N	\N	\N
20c726d4-eaf9-4292-9bf8-26ec431d5cf0	b816fcfb-f11a-4027-b728-a687322fe844	7b9fd8c6ef0b66a19f6b7095f05689670e62fe7f31677922a217455a91764301	2026-10-31 07:15:52.913767-04	2026-10-01 07:15:52.718234-04	Python-urllib/3.14	\N	\N
c79e1fc1-3104-4567-9b2a-2b5b983a7db3	b816fcfb-f11a-4027-b728-a687322fe844	b7cdfded66d518bf58f7af7741bb33a55f0d5be01f912d999abe7f3c503ef491	2026-10-31 09:26:35.597797-04	2026-10-01 09:26:35.401686-04	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	\N	\N
d38c0bf8-2d44-421a-a015-f60edf2c6d90	0442e5cd-e4b7-449d-ae56-8bac0028b958	b839db12a971f5ecc14b49537e94dc2df3b45b5493b2bae9a7e64451ff2e479b	2026-10-31 09:29:09.095495-04	2026-10-01 09:29:08.898233-04	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	\N	\N
b68b6e4c-0180-4553-89ff-9f1962b20e1a	b816fcfb-f11a-4027-b728-a687322fe844	136ab7f8d7a606df6633fa7c78219fdd8d95ebd12e078ed7d235780629e81673	2026-10-30 13:35:28.541587-04	2026-09-30 13:35:28.346141-04	\N	\N	\N
826666eb-41b0-4920-82e7-7c40f8ee43ef	b816fcfb-f11a-4027-b728-a687322fe844	32eb7f5b6a348fcf329c37fd0c99b502ef3feac826308c8f7e99e5bfa67205e8	2026-10-30 13:35:54.910451-04	2026-09-30 13:35:54.715146-04	\N	\N	\N
f0fa52ca-2eb7-477f-b8ac-92c40d2b9024	b816fcfb-f11a-4027-b728-a687322fe844	1b11833623ebe61010db1f526e1dd3d3e05896a5b14155e2956769fb1017effb	2026-10-31 04:00:45.171534-04	2026-10-01 04:00:44.976193-04	\N	\N	\N
ef1d08e0-8a26-46cb-bea7-5d21e3222882	b816fcfb-f11a-4027-b728-a687322fe844	9c3eb36215d9125f7efd7fef949d134c065ee6cf34b472c3f72935ea5fa607ed	2026-10-31 04:57:12.115947-04	2026-10-01 04:57:11.919795-04	curl/8.21.0	\N	\N
19bfed01-eb33-472b-b8e4-203bed90afc2	b816fcfb-f11a-4027-b728-a687322fe844	7280003fea92d1b9ef5ad7e9fe483f95fcaaa40c1595528fe0978addc74e51c7	2026-10-31 05:06:34.954212-04	2026-10-01 05:06:34.754435-04	curl/8.21.0	\N	\N
\.


--
-- Data for Name: uploads; Type: TABLE DATA; Schema: public; Owner: ibrahim_kimaro
--

COPY public.uploads (name, owner_id, content_type, is_public, created_at) FROM stdin;
fe932bea308d4c38b61fd145850a8b59.jpg	0442e5cd-e4b7-449d-ae56-8bac0028b958	image/jpeg	t	2026-10-01 06:39:50.113028-04
c7f1c1bc8b574e4384563b3dfd0a928b.jpg	0442e5cd-e4b7-449d-ae56-8bac0028b958	image/jpeg	t	2026-10-01 06:41:14.376987-04
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: ibrahim_kimaro
--

COPY public.users (id, email, password_hash, is_active, created_at, updated_at, fullname, username, phone_number, is_admin, preferences, otp_pending) FROM stdin;
b816fcfb-f11a-4027-b728-a687322fe844	admin@homeproofolio.co.tz	$2b$12$VJm95vvHxKm7Ybv2UwarJuO9688QznRC0Hl4Xtqfh7eMGJUk0l3MS	t	2026-09-30 07:51:23.871951-04	2026-09-30 07:51:23.871951-04	Home Proofolio	home_proofolio	0123456789	t	{}	f
6850fa8a-1264-4775-b056-a9f6d46edcd1	kimmy@example.com	$2b$12$KpI4.DcVVIlQ0swc9qxDKeQysHSRJ/4uuGAR7F2urqt8L69juGxn6	t	2026-09-30 07:22:14.65342-04	2026-09-30 08:47:16.092012-04	Kimmy Pro	kimmy	+255789123456	f	{}	f
0442e5cd-e4b7-449d-ae56-8bac0028b958	ibrahimkimaro01@gmail.com	$2b$12$kws.nismNmKPK1VMS.D2NemfUQkFWNrGBhbLdLkox9iUouQ6ilKi.	t	2026-09-30 10:15:33.531282-04	2026-10-01 06:42:42.795663-04	Ibrahim issa Kimaro	therealkimmy	+255628726374	t	{"appearance": {"text": "default", "tone": "neutral", "glass": "clean", "theme": "light", "accent": "graphite", "custom": "#955f14", "motion": "system", "contrast": "default"}}	f
\.


--
-- Data for Name: watches; Type: TABLE DATA; Schema: public; Owner: ibrahim_kimaro
--

COPY public.watches (id, user_id, work_id, created_at) FROM stdin;
\.


--
-- Data for Name: work_events; Type: TABLE DATA; Schema: public; Owner: ibrahim_kimaro
--

COPY public.work_events (id, work_id, user_id, field, old_value, new_value, created_at) FROM stdin;
ebc5351d-ed65-4704-a791-1d8d6eaa4b05	91ff9e88-7e0a-453f-ae09-d6d21c03e9bf	0442e5cd-e4b7-449d-ae56-8bac0028b958	created	\N	developer	2026-09-30 10:15:33.900753-04
\.


--
-- Data for Name: work_items; Type: TABLE DATA; Schema: public; Owner: ibrahim_kimaro
--

COPY public.work_items (id, user_id, title, description, context_role, occurred_on, work_type, status, visibility, skills, custom_attributes, evidence_links, created_at, updated_at, template, source_id) FROM stdin;
91ff9e88-7e0a-453f-ae09-d6d21c03e9bf	0442e5cd-e4b7-449d-ae56-8bac0028b958	Engineered offline-first sync queue for clinic records	\N	\N	\N	work	completed	public	["TypeScript", "React", "SQLite"]	{"glass_style": "liquid", "accent_tone": "brass", "palette": "slate"}	[]	2026-09-30 10:15:33.900753-04	2026-09-30 10:15:33.900753-04	developer	\N
\.


--
-- Data for Name: work_templates; Type: TABLE DATA; Schema: public; Owner: ibrahim_kimaro
--

COPY public.work_templates (key, kind, label, description, fields, sort, active) FROM stdin;
sports	work	Sports	Matches, seasons, training	[{"key": "sport", "type": "text", "label": "Sport", "placeholder": "Football"}, {"key": "team", "type": "text", "label": "Team"}, {"key": "position", "type": "text", "label": "Position", "placeholder": "Midfielder"}, {"key": "season", "type": "text", "label": "Season", "placeholder": "2025/26"}, {"key": "matches", "type": "number", "label": "Matches"}, {"key": "goals", "type": "number", "label": "Goals"}, {"key": "assists", "type": "number", "label": "Assists"}, {"key": "footage_url", "type": "url", "label": "Match footage"}]	30	t
young_learner	work	Young learner	School projects and things you made	[{"key": "school", "type": "text", "label": "School"}, {"key": "subject", "type": "text", "label": "Subject"}, {"key": "grade", "type": "text", "label": "Class or grade"}, {"key": "helped_by", "type": "text", "label": "Teacher or mentor"}]	40	t
other	work	Other	Anything else	[]	90	t
learning	learning	Learning	Ideas and things you are learning	[{"key": "source", "type": "text", "label": "Where it came from", "placeholder": "A book, a class, a conversation"}, {"key": "goal", "type": "textarea", "label": "Goal"}, {"key": "questions", "type": "textarea", "label": "Open questions"}, {"key": "understanding", "type": "textarea", "label": "What I understand now"}, {"key": "resources", "type": "list", "label": "Resources"}, {"key": "practice", "type": "textarea", "label": "Practice"}, {"key": "blockers", "type": "textarea", "label": "Blockers"}, {"key": "reflection", "type": "textarea", "label": "Reflection"}, {"key": "next_action", "type": "text", "label": "Next practical step"}]	0	t
achievement	achievement	Achievement	Awards, results, certificates	[{"key": "awarded_by", "type": "text", "label": "Awarded by"}, {"key": "level", "type": "text", "label": "Level", "placeholder": "School, regional, national"}]	0	t
problem	problem	Problem	Something that needs solving	[{"key": "who_is_affected", "type": "textarea", "label": "Who is affected"}, {"key": "impact", "type": "textarea", "label": "Why it matters"}, {"key": "tried", "type": "textarea", "label": "What has been tried"}]	0	t
developer	work	Developer	Software engineering, web, mobile, and system projects	[{"key": "repository", "type": "url", "label": "Repository", "placeholder": "https://github.com/username/repo"}, {"key": "programming_language", "type": "list", "label": "Programming language", "placeholder": "TypeScript, Python, Go"}, {"key": "framework", "type": "list", "label": "Framework", "placeholder": "Next.js, FastAPI, TailwindCSS"}, {"key": "architecture", "type": "text", "label": "Architecture", "placeholder": "Microservices, Event-Driven, Serverless"}, {"key": "deployment", "type": "text", "label": "Deployment", "placeholder": "Vercel, AWS ECS, Docker, Kubernetes"}, {"key": "live_url", "type": "url", "label": "Live link", "placeholder": "https://myproject.com"}]	10	t
designer	work	Graphic designer	Brand identity, UI/UX, product design, and creative media	[{"key": "design_type", "type": "text", "label": "Design type", "placeholder": "Brand Identity, UI/UX, 3D Illustration"}, {"key": "design_tool", "type": "list", "label": "Design tool", "placeholder": "Figma, Adobe Illustrator, Blender"}, {"key": "client", "type": "text", "label": "Client", "placeholder": "Acme Corp, Freelance, Personal"}, {"key": "format", "type": "text", "label": "Format", "placeholder": "Vector SVG, Web App, Print 300DPI, MP4"}, {"key": "creative_medium", "type": "text", "label": "Creative medium", "placeholder": "Digital, Physical, Mixed Media"}, {"key": "prototype_url", "type": "url", "label": "Prototype or file", "placeholder": "https://figma.com/file/..."}]	20	t
footballer	work	Footballer	Matches, seasons, statistics, and club achievements	[{"key": "team", "type": "text", "label": "Team", "placeholder": "Simba SC, Young Africans, National Team"}, {"key": "position", "type": "text", "label": "Position", "placeholder": "Striker, Central Midfielder, Wing Back"}, {"key": "competition", "type": "text", "label": "Competition", "placeholder": "Premier League, CAF Champions League"}, {"key": "season", "type": "text", "label": "Season", "placeholder": "2024/2025"}, {"key": "matches", "type": "number", "label": "Matches", "placeholder": "28"}, {"key": "goals", "type": "number", "label": "Goals", "placeholder": "14"}, {"key": "footage_url", "type": "url", "label": "Match footage", "placeholder": "https://youtube.com/watch?v=..."}]	30	t
pharmacy	work	Pharmacy owner	Healthcare business, pharmaceutical services, and clinical operations	[{"key": "business_type", "type": "text", "label": "Business type", "placeholder": "Retail Pharmacy, Wholesale, Clinic"}, {"key": "services", "type": "list", "label": "Services", "placeholder": "Prescription dispensing, Consultation, Health checks"}, {"key": "products", "type": "list", "label": "Products", "placeholder": "Essential medicines, Medical equipment, Diagnostics"}, {"key": "location", "type": "text", "label": "Location", "placeholder": "Dar es Salaam, Tanzania"}, {"key": "operating_info", "type": "textarea", "label": "Operating information", "placeholder": "Licensed by TMDA, Open 24/7, Home delivery available"}]	40	t
business	work	Business & Founder	Startups, sales, growth, operations, and commerce	[{"key": "business_name", "type": "text", "label": "Business", "placeholder": "Company or Venture Name"}, {"key": "key_result", "type": "text", "label": "Key result", "placeholder": "Scaled to 5,000 active users"}, {"key": "customers", "type": "number", "label": "Customers reached", "placeholder": "5000"}]	50	t
research	work	Researcher	Academic studies, whitepapers, data experiments	[{"key": "question", "type": "textarea", "label": "Research question", "placeholder": "Primary thesis or question"}, {"key": "method", "type": "text", "label": "Method", "placeholder": "Empirical analysis, Double-blind survey"}, {"key": "publication_url", "type": "url", "label": "Publication", "placeholder": "https://doi.org/..."}, {"key": "dataset_url", "type": "url", "label": "Dataset", "placeholder": "https://kaggle.com/..."}]	60	t
\.


--
-- Name: chat_messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: ibrahim_kimaro
--

SELECT pg_catalog.setval('public.chat_messages_id_seq', 1, false);


--
-- Name: admin_actions admin_actions_pkey; Type: CONSTRAINT; Schema: public; Owner: ibrahim_kimaro
--

ALTER TABLE ONLY public.admin_actions
    ADD CONSTRAINT admin_actions_pkey PRIMARY KEY (id);


--
-- Name: alembic_version alembic_version_pkc; Type: CONSTRAINT; Schema: public; Owner: ibrahim_kimaro
--

ALTER TABLE ONLY public.alembic_version
    ADD CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num);


--
-- Name: blocked_ips blocked_ips_pkey; Type: CONSTRAINT; Schema: public; Owner: ibrahim_kimaro
--

ALTER TABLE ONLY public.blocked_ips
    ADD CONSTRAINT blocked_ips_pkey PRIMARY KEY (ip);


--
-- Name: broadcasts broadcasts_pkey; Type: CONSTRAINT; Schema: public; Owner: ibrahim_kimaro
--

ALTER TABLE ONLY public.broadcasts
    ADD CONSTRAINT broadcasts_pkey PRIMARY KEY (id);


--
-- Name: business_members business_members_pkey; Type: CONSTRAINT; Schema: public; Owner: ibrahim_kimaro
--

ALTER TABLE ONLY public.business_members
    ADD CONSTRAINT business_members_pkey PRIMARY KEY (business_id, user_id);


--
-- Name: business_offerings business_offerings_pkey; Type: CONSTRAINT; Schema: public; Owner: ibrahim_kimaro
--

ALTER TABLE ONLY public.business_offerings
    ADD CONSTRAINT business_offerings_pkey PRIMARY KEY (id);


--
-- Name: business_work_links business_work_links_business_id_work_id_key; Type: CONSTRAINT; Schema: public; Owner: ibrahim_kimaro
--

ALTER TABLE ONLY public.business_work_links
    ADD CONSTRAINT business_work_links_business_id_work_id_key UNIQUE (business_id, work_id);


--
-- Name: business_work_links business_work_links_pkey; Type: CONSTRAINT; Schema: public; Owner: ibrahim_kimaro
--

ALTER TABLE ONLY public.business_work_links
    ADD CONSTRAINT business_work_links_pkey PRIMARY KEY (id);


--
-- Name: businesses businesses_pkey; Type: CONSTRAINT; Schema: public; Owner: ibrahim_kimaro
--

ALTER TABLE ONLY public.businesses
    ADD CONSTRAINT businesses_pkey PRIMARY KEY (id);


--
-- Name: chat_messages chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: ibrahim_kimaro
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);


--
-- Name: follows follows_follower_id_user_id_business_id_key; Type: CONSTRAINT; Schema: public; Owner: ibrahim_kimaro
--

ALTER TABLE ONLY public.follows
    ADD CONSTRAINT follows_follower_id_user_id_business_id_key UNIQUE (follower_id, user_id, business_id);


--
-- Name: follows follows_pkey; Type: CONSTRAINT; Schema: public; Owner: ibrahim_kimaro
--

ALTER TABLE ONLY public.follows
    ADD CONSTRAINT follows_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: ibrahim_kimaro
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: onboarding_answers onboarding_answers_pkey; Type: CONSTRAINT; Schema: public; Owner: ibrahim_kimaro
--

ALTER TABLE ONLY public.onboarding_answers
    ADD CONSTRAINT onboarding_answers_pkey PRIMARY KEY (id);


--
-- Name: onboarding_answers onboarding_answers_user_id_question_key_key; Type: CONSTRAINT; Schema: public; Owner: ibrahim_kimaro
--

ALTER TABLE ONLY public.onboarding_answers
    ADD CONSTRAINT onboarding_answers_user_id_question_key_key UNIQUE (user_id, question_key);


--
-- Name: onboarding_categories onboarding_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: ibrahim_kimaro
--

ALTER TABLE ONLY public.onboarding_categories
    ADD CONSTRAINT onboarding_categories_pkey PRIMARY KEY (key);


--
-- Name: onboarding_questions onboarding_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: ibrahim_kimaro
--

ALTER TABLE ONLY public.onboarding_questions
    ADD CONSTRAINT onboarding_questions_pkey PRIMARY KEY (id);


--
-- Name: onboarding_roles onboarding_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: ibrahim_kimaro
--

ALTER TABLE ONLY public.onboarding_roles
    ADD CONSTRAINT onboarding_roles_pkey PRIMARY KEY (key);


--
-- Name: otp_logs otp_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: ibrahim_kimaro
--

ALTER TABLE ONLY public.otp_logs
    ADD CONSTRAINT otp_logs_pkey PRIMARY KEY (id);


--
-- Name: platform_settings platform_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: ibrahim_kimaro
--

ALTER TABLE ONLY public.platform_settings
    ADD CONSTRAINT platform_settings_pkey PRIMARY KEY (key);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: ibrahim_kimaro
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: ibrahim_kimaro
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: ibrahim_kimaro
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: security_events security_events_pkey; Type: CONSTRAINT; Schema: public; Owner: ibrahim_kimaro
--

ALTER TABLE ONLY public.security_events
    ADD CONSTRAINT security_events_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: ibrahim_kimaro
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: uploads uploads_pkey; Type: CONSTRAINT; Schema: public; Owner: ibrahim_kimaro
--

ALTER TABLE ONLY public.uploads
    ADD CONSTRAINT uploads_pkey PRIMARY KEY (name);


--
-- Name: chat_messages uq_chat_messages_author_client; Type: CONSTRAINT; Schema: public; Owner: ibrahim_kimaro
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT uq_chat_messages_author_client UNIQUE (author_id, client_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: ibrahim_kimaro
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: watches watches_pkey; Type: CONSTRAINT; Schema: public; Owner: ibrahim_kimaro
--

ALTER TABLE ONLY public.watches
    ADD CONSTRAINT watches_pkey PRIMARY KEY (id);


--
-- Name: watches watches_user_id_work_id_key; Type: CONSTRAINT; Schema: public; Owner: ibrahim_kimaro
--

ALTER TABLE ONLY public.watches
    ADD CONSTRAINT watches_user_id_work_id_key UNIQUE (user_id, work_id);


--
-- Name: work_events work_events_pkey; Type: CONSTRAINT; Schema: public; Owner: ibrahim_kimaro
--

ALTER TABLE ONLY public.work_events
    ADD CONSTRAINT work_events_pkey PRIMARY KEY (id);


--
-- Name: work_items work_items_pkey; Type: CONSTRAINT; Schema: public; Owner: ibrahim_kimaro
--

ALTER TABLE ONLY public.work_items
    ADD CONSTRAINT work_items_pkey PRIMARY KEY (id);


--
-- Name: work_templates work_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: ibrahim_kimaro
--

ALTER TABLE ONLY public.work_templates
    ADD CONSTRAINT work_templates_pkey PRIMARY KEY (key);


--
-- Name: ix_admin_actions_admin_id; Type: INDEX; Schema: public; Owner: ibrahim_kimaro
--

CREATE INDEX ix_admin_actions_admin_id ON public.admin_actions USING btree (admin_id);


--
-- Name: ix_admin_actions_created_at; Type: INDEX; Schema: public; Owner: ibrahim_kimaro
--

CREATE INDEX ix_admin_actions_created_at ON public.admin_actions USING btree (created_at);


--
-- Name: ix_broadcasts_created_at; Type: INDEX; Schema: public; Owner: ibrahim_kimaro
--

CREATE INDEX ix_broadcasts_created_at ON public.broadcasts USING btree (created_at);


--
-- Name: ix_business_offerings_business_id; Type: INDEX; Schema: public; Owner: ibrahim_kimaro
--

CREATE INDEX ix_business_offerings_business_id ON public.business_offerings USING btree (business_id);


--
-- Name: ix_business_work_links_business_id; Type: INDEX; Schema: public; Owner: ibrahim_kimaro
--

CREATE INDEX ix_business_work_links_business_id ON public.business_work_links USING btree (business_id);


--
-- Name: ix_business_work_links_work_id; Type: INDEX; Schema: public; Owner: ibrahim_kimaro
--

CREATE INDEX ix_business_work_links_work_id ON public.business_work_links USING btree (work_id);


--
-- Name: ix_businesses_slug; Type: INDEX; Schema: public; Owner: ibrahim_kimaro
--

CREATE UNIQUE INDEX ix_businesses_slug ON public.businesses USING btree (slug);


--
-- Name: ix_chat_messages_topic_id; Type: INDEX; Schema: public; Owner: ibrahim_kimaro
--

CREATE INDEX ix_chat_messages_topic_id ON public.chat_messages USING btree (topic, id);


--
-- Name: ix_chat_messages_unread; Type: INDEX; Schema: public; Owner: ibrahim_kimaro
--

CREATE INDEX ix_chat_messages_unread ON public.chat_messages USING btree (recipient_id) WHERE (read_at IS NULL);


--
-- Name: ix_follows_business_id; Type: INDEX; Schema: public; Owner: ibrahim_kimaro
--

CREATE INDEX ix_follows_business_id ON public.follows USING btree (business_id);


--
-- Name: ix_follows_follower_id; Type: INDEX; Schema: public; Owner: ibrahim_kimaro
--

CREATE INDEX ix_follows_follower_id ON public.follows USING btree (follower_id);


--
-- Name: ix_follows_user_id; Type: INDEX; Schema: public; Owner: ibrahim_kimaro
--

CREATE INDEX ix_follows_user_id ON public.follows USING btree (user_id);


--
-- Name: ix_notifications_created_at; Type: INDEX; Schema: public; Owner: ibrahim_kimaro
--

CREATE INDEX ix_notifications_created_at ON public.notifications USING btree (created_at);


--
-- Name: ix_notifications_user_id; Type: INDEX; Schema: public; Owner: ibrahim_kimaro
--

CREATE INDEX ix_notifications_user_id ON public.notifications USING btree (user_id);


--
-- Name: ix_onboarding_answers_question_key; Type: INDEX; Schema: public; Owner: ibrahim_kimaro
--

CREATE INDEX ix_onboarding_answers_question_key ON public.onboarding_answers USING btree (question_key);


--
-- Name: ix_onboarding_answers_user_id; Type: INDEX; Schema: public; Owner: ibrahim_kimaro
--

CREATE INDEX ix_onboarding_answers_user_id ON public.onboarding_answers USING btree (user_id);


--
-- Name: ix_onboarding_roles_category_key; Type: INDEX; Schema: public; Owner: ibrahim_kimaro
--

CREATE INDEX ix_onboarding_roles_category_key ON public.onboarding_roles USING btree (category_key);


--
-- Name: ix_otp_logs_destination; Type: INDEX; Schema: public; Owner: ibrahim_kimaro
--

CREATE INDEX ix_otp_logs_destination ON public.otp_logs USING btree (destination);


--
-- Name: ix_profiles_username; Type: INDEX; Schema: public; Owner: ibrahim_kimaro
--

CREATE UNIQUE INDEX ix_profiles_username ON public.profiles USING btree (username);


--
-- Name: ix_roles_business_id; Type: INDEX; Schema: public; Owner: ibrahim_kimaro
--

CREATE INDEX ix_roles_business_id ON public.roles USING btree (business_id);


--
-- Name: ix_roles_user_id; Type: INDEX; Schema: public; Owner: ibrahim_kimaro
--

CREATE INDEX ix_roles_user_id ON public.roles USING btree (user_id);


--
-- Name: ix_security_events_created_at; Type: INDEX; Schema: public; Owner: ibrahim_kimaro
--

CREATE INDEX ix_security_events_created_at ON public.security_events USING btree (created_at);


--
-- Name: ix_security_events_ip; Type: INDEX; Schema: public; Owner: ibrahim_kimaro
--

CREATE INDEX ix_security_events_ip ON public.security_events USING btree (ip);


--
-- Name: ix_security_events_kind; Type: INDEX; Schema: public; Owner: ibrahim_kimaro
--

CREATE INDEX ix_security_events_kind ON public.security_events USING btree (kind);


--
-- Name: ix_security_events_user_id; Type: INDEX; Schema: public; Owner: ibrahim_kimaro
--

CREATE INDEX ix_security_events_user_id ON public.security_events USING btree (user_id);


--
-- Name: ix_sessions_token_hash; Type: INDEX; Schema: public; Owner: ibrahim_kimaro
--

CREATE UNIQUE INDEX ix_sessions_token_hash ON public.sessions USING btree (token_hash);


--
-- Name: ix_sessions_user_id; Type: INDEX; Schema: public; Owner: ibrahim_kimaro
--

CREATE INDEX ix_sessions_user_id ON public.sessions USING btree (user_id);


--
-- Name: ix_uploads_owner_id; Type: INDEX; Schema: public; Owner: ibrahim_kimaro
--

CREATE INDEX ix_uploads_owner_id ON public.uploads USING btree (owner_id);


--
-- Name: ix_users_email; Type: INDEX; Schema: public; Owner: ibrahim_kimaro
--

CREATE UNIQUE INDEX ix_users_email ON public.users USING btree (email);


--
-- Name: ix_users_phone_number; Type: INDEX; Schema: public; Owner: ibrahim_kimaro
--

CREATE INDEX ix_users_phone_number ON public.users USING btree (phone_number);


--
-- Name: ix_users_username; Type: INDEX; Schema: public; Owner: ibrahim_kimaro
--

CREATE UNIQUE INDEX ix_users_username ON public.users USING btree (username);


--
-- Name: ix_watches_user_id; Type: INDEX; Schema: public; Owner: ibrahim_kimaro
--

CREATE INDEX ix_watches_user_id ON public.watches USING btree (user_id);


--
-- Name: ix_watches_work_id; Type: INDEX; Schema: public; Owner: ibrahim_kimaro
--

CREATE INDEX ix_watches_work_id ON public.watches USING btree (work_id);


--
-- Name: ix_work_events_created_at; Type: INDEX; Schema: public; Owner: ibrahim_kimaro
--

CREATE INDEX ix_work_events_created_at ON public.work_events USING btree (created_at);


--
-- Name: ix_work_events_user_id; Type: INDEX; Schema: public; Owner: ibrahim_kimaro
--

CREATE INDEX ix_work_events_user_id ON public.work_events USING btree (user_id);


--
-- Name: ix_work_events_work_id; Type: INDEX; Schema: public; Owner: ibrahim_kimaro
--

CREATE INDEX ix_work_events_work_id ON public.work_events USING btree (work_id);


--
-- Name: ix_work_items_user_id; Type: INDEX; Schema: public; Owner: ibrahim_kimaro
--

CREATE INDEX ix_work_items_user_id ON public.work_items USING btree (user_id);


--
-- Name: ix_work_templates_kind; Type: INDEX; Schema: public; Owner: ibrahim_kimaro
--

CREATE INDEX ix_work_templates_kind ON public.work_templates USING btree (kind);


--
-- Name: uq_notifications_unread_message; Type: INDEX; Schema: public; Owner: ibrahim_kimaro
--

CREATE UNIQUE INDEX uq_notifications_unread_message ON public.notifications USING btree (user_id, link) WHERE (((kind)::text = 'message'::text) AND (read_at IS NULL));


--
-- Name: admin_actions admin_actions_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ibrahim_kimaro
--

ALTER TABLE ONLY public.admin_actions
    ADD CONSTRAINT admin_actions_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: blocked_ips blocked_ips_blocked_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ibrahim_kimaro
--

ALTER TABLE ONLY public.blocked_ips
    ADD CONSTRAINT blocked_ips_blocked_by_fkey FOREIGN KEY (blocked_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: broadcasts broadcasts_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ibrahim_kimaro
--

ALTER TABLE ONLY public.broadcasts
    ADD CONSTRAINT broadcasts_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: business_members business_members_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ibrahim_kimaro
--

ALTER TABLE ONLY public.business_members
    ADD CONSTRAINT business_members_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: business_members business_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ibrahim_kimaro
--

ALTER TABLE ONLY public.business_members
    ADD CONSTRAINT business_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: business_offerings business_offerings_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ibrahim_kimaro
--

ALTER TABLE ONLY public.business_offerings
    ADD CONSTRAINT business_offerings_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: business_work_links business_work_links_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ibrahim_kimaro
--

ALTER TABLE ONLY public.business_work_links
    ADD CONSTRAINT business_work_links_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: business_work_links business_work_links_work_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ibrahim_kimaro
--

ALTER TABLE ONLY public.business_work_links
    ADD CONSTRAINT business_work_links_work_id_fkey FOREIGN KEY (work_id) REFERENCES public.work_items(id) ON DELETE CASCADE;


--
-- Name: chat_messages chat_messages_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ibrahim_kimaro
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: chat_messages chat_messages_recipient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ibrahim_kimaro
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: work_items fk_work_items_source_id; Type: FK CONSTRAINT; Schema: public; Owner: ibrahim_kimaro
--

ALTER TABLE ONLY public.work_items
    ADD CONSTRAINT fk_work_items_source_id FOREIGN KEY (source_id) REFERENCES public.work_items(id) ON DELETE SET NULL;


--
-- Name: follows follows_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ibrahim_kimaro
--

ALTER TABLE ONLY public.follows
    ADD CONSTRAINT follows_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: follows follows_follower_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ibrahim_kimaro
--

ALTER TABLE ONLY public.follows
    ADD CONSTRAINT follows_follower_id_fkey FOREIGN KEY (follower_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: follows follows_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ibrahim_kimaro
--

ALTER TABLE ONLY public.follows
    ADD CONSTRAINT follows_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ibrahim_kimaro
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: onboarding_answers onboarding_answers_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ibrahim_kimaro
--

ALTER TABLE ONLY public.onboarding_answers
    ADD CONSTRAINT onboarding_answers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: onboarding_roles onboarding_roles_category_key_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ibrahim_kimaro
--

ALTER TABLE ONLY public.onboarding_roles
    ADD CONSTRAINT onboarding_roles_category_key_fkey FOREIGN KEY (category_key) REFERENCES public.onboarding_categories(key) ON DELETE CASCADE;


--
-- Name: otp_logs otp_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ibrahim_kimaro
--

ALTER TABLE ONLY public.otp_logs
    ADD CONSTRAINT otp_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: profiles profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ibrahim_kimaro
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: roles roles_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ibrahim_kimaro
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE SET NULL;


--
-- Name: roles roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ibrahim_kimaro
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: security_events security_events_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ibrahim_kimaro
--

ALTER TABLE ONLY public.security_events
    ADD CONSTRAINT security_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ibrahim_kimaro
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: uploads uploads_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ibrahim_kimaro
--

ALTER TABLE ONLY public.uploads
    ADD CONSTRAINT uploads_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: watches watches_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ibrahim_kimaro
--

ALTER TABLE ONLY public.watches
    ADD CONSTRAINT watches_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: watches watches_work_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ibrahim_kimaro
--

ALTER TABLE ONLY public.watches
    ADD CONSTRAINT watches_work_id_fkey FOREIGN KEY (work_id) REFERENCES public.work_items(id) ON DELETE CASCADE;


--
-- Name: work_events work_events_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ibrahim_kimaro
--

ALTER TABLE ONLY public.work_events
    ADD CONSTRAINT work_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: work_events work_events_work_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ibrahim_kimaro
--

ALTER TABLE ONLY public.work_events
    ADD CONSTRAINT work_events_work_id_fkey FOREIGN KEY (work_id) REFERENCES public.work_items(id) ON DELETE CASCADE;


--
-- Name: work_items work_items_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ibrahim_kimaro
--

ALTER TABLE ONLY public.work_items
    ADD CONSTRAINT work_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT ALL ON SCHEMA public TO ibrahim_kimaro;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO ibrahim_kimaro;


--
-- PostgreSQL database dump complete
--

\unrestrict BOyFiF2Do20qlVkqfTAESzwYV6m5g50Z1lxPE5YbogdcLF9VMYioRQpqevPfm1R

