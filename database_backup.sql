--
-- PostgreSQL database dump
--

\restrict r3jEA0iAyg8TiaHFREOpQPqJVeUK7Vf8QubTdEUlcBDLneCUwMXtB7Pgen4SGJo

-- Dumped from database version 16.15
-- Dumped by pg_dump version 16.15

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    user_ids jsonb,
    failed integer DEFAULT 0 NOT NULL
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
-- Name: chat_clears; Type: TABLE; Schema: public; Owner: ibrahim_kimaro
--

CREATE TABLE public.chat_clears (
    user_id uuid NOT NULL,
    topic character varying(200) NOT NULL,
    up_to bigint NOT NULL,
    cleared_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.chat_clears OWNER TO ibrahim_kimaro;

--
-- Name: chat_group_members; Type: TABLE; Schema: public; Owner: ibrahim_kimaro
--

CREATE TABLE public.chat_group_members (
    group_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role character varying(10) DEFAULT 'member'::character varying NOT NULL,
    status character varying(10) DEFAULT 'invited'::character varying NOT NULL,
    invited_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    joined_at timestamp with time zone
);


ALTER TABLE public.chat_group_members OWNER TO ibrahim_kimaro;

--
-- Name: chat_groups; Type: TABLE; Schema: public; Owner: ibrahim_kimaro
--

CREATE TABLE public.chat_groups (
    id uuid NOT NULL,
    slug character varying(64) NOT NULL,
    name character varying(120) NOT NULL,
    topic character varying(200) DEFAULT ''::character varying NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    avatar_url character varying(300)
);


ALTER TABLE public.chat_groups OWNER TO ibrahim_kimaro;

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
    read_at timestamp with time zone,
    attachment jsonb,
    edited_at timestamp with time zone,
    deleted_at timestamp with time zone
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
-- Name: comments; Type: TABLE; Schema: public; Owner: ibrahim_kimaro
--

CREATE TABLE public.comments (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    target_kind character varying(10) NOT NULL,
    target_id uuid NOT NULL,
    body text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.comments OWNER TO ibrahim_kimaro;

--
-- Name: cv_requests; Type: TABLE; Schema: public; Owner: ibrahim_kimaro
--

CREATE TABLE public.cv_requests (
    id uuid NOT NULL,
    owner_id uuid NOT NULL,
    requester_id uuid,
    name character varying(100) NOT NULL,
    email character varying(255),
    message character varying(500),
    status character varying(10) DEFAULT 'pending'::character varying NOT NULL,
    ip character varying(64),
    created_at timestamp with time zone DEFAULT now(),
    decided_at timestamp with time zone
);


ALTER TABLE public.cv_requests OWNER TO ibrahim_kimaro;

--
-- Name: cvs; Type: TABLE; Schema: public; Owner: ibrahim_kimaro
--

CREATE TABLE public.cvs (
    user_id uuid NOT NULL,
    data jsonb DEFAULT '{}'::jsonb NOT NULL,
    signature text,
    signed_at timestamp with time zone,
    share_token character varying(64),
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.cvs OWNER TO ibrahim_kimaro;

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
-- Name: guests; Type: TABLE; Schema: public; Owner: ibrahim_kimaro
--

CREATE TABLE public.guests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id character varying(64) NOT NULL,
    user_id uuid NOT NULL,
    ip_address character varying(45),
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_seen_at timestamp with time zone DEFAULT now() NOT NULL,
    name character varying(60),
    email character varying(255),
    visits integer DEFAULT 1 NOT NULL
);


ALTER TABLE public.guests OWNER TO ibrahim_kimaro;

--
-- Name: likes; Type: TABLE; Schema: public; Owner: ibrahim_kimaro
--

CREATE TABLE public.likes (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    target_kind character varying(10) NOT NULL,
    target_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.likes OWNER TO ibrahim_kimaro;

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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    broadcast_id uuid,
    delivered_at timestamp with time zone
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
    verified_at timestamp with time zone,
    sent_via character varying(20)
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
-- Name: push_subscriptions; Type: TABLE; Schema: public; Owner: ibrahim_kimaro
--

CREATE TABLE public.push_subscriptions (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    endpoint text NOT NULL,
    p256dh character varying(200) NOT NULL,
    auth character varying(100) NOT NULL,
    user_agent character varying(300),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_used_at timestamp with time zone
);


ALTER TABLE public.push_subscriptions OWNER TO ibrahim_kimaro;

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
    otp_pending boolean DEFAULT false NOT NULL,
    is_guest boolean DEFAULT false NOT NULL,
    activation_deadline timestamp with time zone
);


ALTER TABLE public.users OWNER TO ibrahim_kimaro;

--
-- Name: visitor_messages; Type: TABLE; Schema: public; Owner: ibrahim_kimaro
--

CREATE TABLE public.visitor_messages (
    id uuid NOT NULL,
    owner_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    email character varying(255),
    body text NOT NULL,
    ip character varying(64),
    created_at timestamp with time zone DEFAULT now(),
    read_at timestamp with time zone
);


ALTER TABLE public.visitor_messages OWNER TO ibrahim_kimaro;

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
0bb3c977-eed5-4619-b1ee-b5fd4ed6914a	b816fcfb-f11a-4027-b728-a687322fe844	onboarding.question.create	e39c3dc9-aaf3-46f1-83b0-62b081b6607d	{"prompt": "What brings you to Home Proofolio?"}	2026-10-01 11:03:00.857735+00
5ebf7fbf-cd46-4497-9106-68a7890d127c	b816fcfb-f11a-4027-b728-a687322fe844	onboarding.category.create	farming	{"label": "Farming & Agriculture"}	2026-10-01 11:03:01.590268+00
d208179c-6548-4cc2-9148-6174726144f6	b816fcfb-f11a-4027-b728-a687322fe844	onboarding.role.create	farmer	{"label": "Farmer"}	2026-10-01 11:03:01.813859+00
7d9cb352-43d3-4801-b107-d41b9c4b22bb	b816fcfb-f11a-4027-b728-a687322fe844	onboarding.steps.update	\N	{"enabled": {"work": true, "account": true, "evidence": false, "questions": true, "appearance": true, "discipline": true}}	2026-10-01 11:03:02.052663+00
0cfa7986-bb73-45f9-92ab-7bf084572674	b816fcfb-f11a-4027-b728-a687322fe844	template.create	farming	{"label": "Farming"}	2026-10-01 11:03:02.455323+00
5f6efe67-b2e8-4b9a-b5b6-6a6c877ad599	b816fcfb-f11a-4027-b728-a687322fe844	platform.announcement	\N	{"text": "Welcome to the beta! Share your profile link to invite friends.", "active": true}	2026-10-01 11:03:02.680981+00
57908b8a-9950-4531-a472-86549f8d6af5	b816fcfb-f11a-4027-b728-a687322fe844	platform.registration	\N	{"open": false}	2026-10-01 11:03:03.132467+00
aefb6eaa-b7bf-4111-984c-a682ff84297f	b816fcfb-f11a-4027-b728-a687322fe844	platform.registration	\N	{"open": true}	2026-10-01 11:03:03.482964+00
97db7669-2798-49c8-82a6-8be6a93a8e89	b816fcfb-f11a-4027-b728-a687322fe844	onboarding.steps.update	\N	{"enabled": {"work": true, "account": true, "evidence": true, "questions": true, "appearance": true, "discipline": true}}	2026-10-01 11:03:59.684003+00
49d32105-3d5d-49e5-96f5-78d85b07bc26	b816fcfb-f11a-4027-b728-a687322fe844	user.delete	juma-farmer	{"email": "farm150120@test.io"}	2026-10-01 11:15:41.842919+00
154eaf55-32f2-4a8b-8b45-e38d8badc642	b816fcfb-f11a-4027-b728-a687322fe844	user.delete	onbq31913	{"email": "onbq31913@test.io"}	2026-10-01 11:15:41.899212+00
40004ce4-8b3b-497d-8d2d-64cc2ad43f6b	b816fcfb-f11a-4027-b728-a687322fe844	onboarding.question.delete	e39c3dc9-aaf3-46f1-83b0-62b081b6607d	{"prompt": "What brings you to Home Proofolio?"}	2026-10-01 11:15:41.933426+00
46d9eb30-3ab0-4d5d-8d9e-54092cd86060	b816fcfb-f11a-4027-b728-a687322fe844	onboarding.role.delete	farmer	{"label": "Farmer"}	2026-10-01 11:15:41.974431+00
7b1925e6-575c-4b1c-9cde-2998218c10ae	b816fcfb-f11a-4027-b728-a687322fe844	onboarding.category.delete	farming	{}	2026-10-01 11:15:42.032335+00
e88d9eb6-b99f-41f8-9894-3b843341b69c	b816fcfb-f11a-4027-b728-a687322fe844	template.delete	farming	{}	2026-10-01 11:15:42.097307+00
dfecae98-63fe-4aae-a1a8-ce940aada8fd	b816fcfb-f11a-4027-b728-a687322fe844	platform.announcement	\N	{"text": "", "active": false}	2026-10-01 11:15:42.132819+00
84b0ec7c-fd28-4d6f-9445-5e3a9ebe0518	b816fcfb-f11a-4027-b728-a687322fe844	user.update	bud48983	{"is_active": true}	2026-10-01 11:15:53.009067+00
731da984-b030-40f5-bcc8-5cdbbe2db7aa	b816fcfb-f11a-4027-b728-a687322fe844	work.moderate	e35a5fd8-5184-4ceb-ab17-d0dfca28931c	{"title": "Member work", "visibility": "private"}	2026-10-01 11:15:53.049142+00
7526aa5d-f9f7-492b-9ae5-3652c6d929aa	b816fcfb-f11a-4027-b728-a687322fe844	work.delete	e35a5fd8-5184-4ceb-ab17-d0dfca28931c	{"owner": "bud48983", "title": "Member work"}	2026-10-01 11:15:53.077879+00
e6a364f1-0f2a-4c7e-b9cc-b1f8ce02e321	b816fcfb-f11a-4027-b728-a687322fe844	user.delete	bud48983	{"email": "bud48983@test.io"}	2026-10-01 11:15:53.426088+00
ef5761da-e7d3-48d4-8471-15be5da31bb6	b816fcfb-f11a-4027-b728-a687322fe844	user.update	kimmy	{"headline": "Senior Product & Systems Designer", "role_title": "UI/UX & Product Designer"}	2026-10-03 06:21:47.153689+00
3046bea9-1ec0-4559-aaaf-757fd6477720	b816fcfb-f11a-4027-b728-a687322fe844	user.delete	kimmy	{"email": "kimmy@example.com"}	2026-10-03 06:31:38.37595+00
41262185-e235-44cc-8762-79852691dde0	b816fcfb-f11a-4027-b728-a687322fe844	session.end_all	104fa91b-9a67-40fc-8a4c-453e9b380ef8	{}	2026-10-03 06:53:43.665605+00
15d154cf-6300-4ea6-a920-213c2107f5ed	b816fcfb-f11a-4027-b728-a687322fe844	broadcast.send	in_app	{"segment": "selected", "recipients": 2}	2026-10-04 09:34:44.129597+00
9f70cab3-2446-4c03-aff9-5fcc88d2e845	b816fcfb-f11a-4027-b728-a687322fe844	broadcast.send	email	{"segment": "selected", "recipients": 1}	2026-10-04 10:25:02.49304+00
e138b277-4825-4d5f-b2a7-b557fe0a8b06	b816fcfb-f11a-4027-b728-a687322fe844	otp.email_again	0d998ad9-9b13-4a17-8f42-b457e7ee6e69	{"destination": "homeproofolio+codetest2@gmail.com"}	2026-10-04 10:53:29.916688+00
d5dafca5-f402-4eac-8483-8bf4dd40e7d8	b816fcfb-f11a-4027-b728-a687322fe844	otp.sent	0d998ad9-9b13-4a17-8f42-b457e7ee6e69	{"channel": "email", "destination": "homeproofolio+codetest2@gmail.com"}	2026-10-04 10:53:36.047816+00
f1e94b12-2316-4ecb-a254-0c0d5fe19177	b816fcfb-f11a-4027-b728-a687322fe844	platform.announcement	\N	{"text": "hello eveyone", "active": false}	2026-10-04 11:09:35.194354+00
f28dd6a9-b43a-4d39-ba9e-1c5b2f366d13	b816fcfb-f11a-4027-b728-a687322fe844	platform.announcement	\N	{"text": "hello eveyone", "active": true}	2026-10-04 11:09:47.401373+00
c8df0446-d5c0-4809-8642-c62ec2124d8d	b816fcfb-f11a-4027-b728-a687322fe844	platform.announcement	\N	{"text": "hello eveyone", "active": true}	2026-10-04 11:10:02.606712+00
8e9c4772-f4b9-419a-aeec-7af4d96e0186	b816fcfb-f11a-4027-b728-a687322fe844	user.delete	msgtest_b	{"email": "homeproofolio+msgtest@gmail.com"}	2026-10-04 12:34:28.188312+00
53b6bd9f-64d5-4a49-99b7-76517d0a3879	b816fcfb-f11a-4027-b728-a687322fe844	user.delete	guest_5872defd	{"email": "2a72d976-336c-4358-8e61-2866374456f4@guest.proofolio.local"}	2026-10-04 12:34:30.226747+00
ddcc5f97-743a-4221-bffc-22ccc1a663c9	b816fcfb-f11a-4027-b728-a687322fe844	user.delete	guest_2bf255c8	{"email": "23b62fcc-62d1-41cb-a61c-09af529c87f6@guest.proofolio.local"}	2026-10-04 12:34:31.861591+00
4f5026f3-4795-4a15-9479-1b8f1db2adbb	b816fcfb-f11a-4027-b728-a687322fe844	user.delete	guest_4aa050e1	{"email": "6e56bb6e-c82c-4bf1-93a2-cb7da99e45ce@guest.proofolio.local"}	2026-10-04 12:34:33.220132+00
fd4eec37-6ca1-417b-9426-76c859888561	b816fcfb-f11a-4027-b728-a687322fe844	user.delete	guest_163698a3	{"email": "fef6b451-a76c-47e6-8732-7b798923c06b@guest.proofolio.local"}	2026-10-04 12:34:36.082284+00
7ef8a9e6-247d-4d4e-850b-457ddd6637fb	b816fcfb-f11a-4027-b728-a687322fe844	user.delete	cvtest_a	{"email": "cvtest_a@grouptest.proofolio.dev"}	2026-10-04 12:34:40.685535+00
17dcd58f-8ad4-4b31-8d7f-53aad8ad0c93	b816fcfb-f11a-4027-b728-a687322fe844	user.delete	guest_guest-17	{"email": "a19fd50e-7ebb-434b-a069-e718a88cbd98@guest.proofolio.local"}	2026-10-04 12:34:48.390337+00
83b7d35d-91cf-42bc-87fb-7a3131c3c4f9	b816fcfb-f11a-4027-b728-a687322fe844	user.delete	guest_0d9e6ce4	{"email": "6ec2fca8-89f5-4180-bd0e-ef42262b7eb5@guest.proofolio.local"}	2026-10-04 12:34:50.207341+00
e5f0bab0-50e9-44ff-bc06-6904cddbd6a1	b816fcfb-f11a-4027-b728-a687322fe844	onboarding.role.create	ethical-hacking	{"label": "Ethical hacking"}	2026-10-04 14:48:22.331035+00
a5b74f0e-7afc-49ee-9e4f-f3ac441dc73f	b816fcfb-f11a-4027-b728-a687322fe844	onboarding.role.update	ethical-hacking	{"label": "Ethical hacking", "template": "developer", "evidence_hint": "", "example_title": "penetration tester, social engeneering, malware attacker", "example_skills": ""}	2026-10-04 14:49:48.83981+00
e59f483d-8941-4b14-9a45-929531cfd94d	b816fcfb-f11a-4027-b728-a687322fe844	onboarding.role.update	ethical-hacking	{"label": "Ethical hacking", "template": "developer", "evidence_hint": "", "example_title": "", "example_skills": "penetration tester, social engeneering, malware attacker"}	2026-10-04 14:52:15.329292+00
0fd447f3-0ba6-4af3-bde5-497916e0424c	b816fcfb-f11a-4027-b728-a687322fe844	platform.announcement	\N	{"text": "hello eveyone", "active": false}	2026-10-04 15:02:12.292314+00
13bda24e-6584-4e9a-8b6f-e0616cdff22c	b816fcfb-f11a-4027-b728-a687322fe844	platform.announcement	\N	{"text": "hello eveyone", "active": false}	2026-10-04 15:02:14.954391+00
00e6fab2-bfe7-4c91-9984-01489fb95c44	b816fcfb-f11a-4027-b728-a687322fe844	platform.announcement	\N	{"text": "hello eveyone", "active": false}	2026-10-04 15:02:15.839371+00
91334616-8378-4fcd-933a-d44e64c5d8ed	b816fcfb-f11a-4027-b728-a687322fe844	platform.announcement	\N	{"text": "", "active": false}	2026-10-04 15:02:25.545277+00
b28bdc83-e527-44e1-85fe-1493245138b1	b816fcfb-f11a-4027-b728-a687322fe844	platform.announcement	\N	{"text": "", "active": false}	2026-10-04 15:02:25.761239+00
b9de5b29-563c-4981-9653-3671bd7a9b86	b816fcfb-f11a-4027-b728-a687322fe844	otp.send	ibrahimkimaro01@gmail.com	{"channel": "email", "purpose": "login", "delivery": "emailed"}	2026-10-04 15:15:38.983945+00
032aa7da-07fd-44a8-b4b3-adffc2bd3686	b816fcfb-f11a-4027-b728-a687322fe844	otp.send	0628 726 374	{"channel": "phone", "purpose": "phone_verification", "delivery": "manual"}	2026-10-04 15:15:42.610634+00
ed1926b9-538f-46f8-9a1f-b05c4025fa23	b816fcfb-f11a-4027-b728-a687322fe844	otp.send	0628 726 374	{"channel": "phone", "purpose": "admin_test", "delivery": "manual"}	2026-10-04 15:16:05.953407+00
e26d4742-e9ac-4349-bce2-1f4070cbc304	b816fcfb-f11a-4027-b728-a687322fe844	otp.send	+255 762 244 981	{"channel": "phone", "purpose": "admin_test", "delivery": "manual"}	2026-10-04 15:16:06.380367+00
dd480f91-59c4-4473-9e20-e6dc937977c8	b816fcfb-f11a-4027-b728-a687322fe844	otp.send	ibrahimkimaro01@gmail.com	{"channel": "email", "purpose": "password_change", "delivery": "emailed"}	2026-10-04 15:19:36.605414+00
dd794c3e-06e8-4a89-b72f-4f60e8fc413b	b816fcfb-f11a-4027-b728-a687322fe844	otp.send	ibrahimkimaro01@gmail.com	{"channel": "email", "purpose": "activation", "delivery": "emailed"}	2026-10-04 16:03:00.512121+00
1c6ce24e-6265-4dce-bde4-bdd871feea70	b816fcfb-f11a-4027-b728-a687322fe844	otp.send	+255 700 000 111	{"channel": "phone", "purpose": "login", "delivery": "manual"}	2026-10-04 16:07:40.288133+00
053d2575-bceb-4984-9de8-4aa81694ad98	b816fcfb-f11a-4027-b728-a687322fe844	otp.sent	50217617-9d67-4da6-9826-a841d264f08b	{"channel": "phone", "destination": "+255 700 000 111"}	2026-10-04 16:07:42.223296+00
44dda350-f6d1-4cb5-b318-51cc1941e437	b816fcfb-f11a-4027-b728-a687322fe844	otp.send	+255 700 000 111	{"channel": "phone", "purpose": "password_change", "delivery": "manual"}	2026-10-04 16:07:44.702991+00
58ab3156-ed40-40fd-8cd8-cbae450f1770	b816fcfb-f11a-4027-b728-a687322fe844	otp.sent	a913af3a-ca02-4098-9635-291e4c5a5795	{"channel": "phone", "destination": "+255 700 000 111"}	2026-10-04 16:07:45.893294+00
9f72e05c-93e6-4eaf-925a-1f44e4646318	b816fcfb-f11a-4027-b728-a687322fe844	otp.send	+255 700 000 111	{"channel": "phone", "purpose": "login", "delivery": "manual"}	2026-10-04 16:09:39.435119+00
5740c43b-3710-42d2-b8ab-4f75c3466af3	b816fcfb-f11a-4027-b728-a687322fe844	otp.sent	6b14131e-9145-4af1-af68-b9e1a63d8bef	{"channel": "phone", "destination": "+255 700 000 111"}	2026-10-04 16:09:40.517725+00
a5e2c683-b596-4065-b3e3-2583f76608c1	b816fcfb-f11a-4027-b728-a687322fe844	otp.send	0123456789	{"channel": "phone", "purpose": "password_change", "delivery": "manual"}	2026-10-04 16:13:08.48886+00
ef41c614-8a91-4d65-999c-56a1a511f411	b816fcfb-f11a-4027-b728-a687322fe844	otp.sent	aa7f1b00-f0f5-45fd-93c1-408de04e2cf4	{"channel": "phone", "destination": "0123456789"}	2026-10-04 16:13:10.157089+00
0f7cea0c-cdb3-4091-9529-fac346cba161	b816fcfb-f11a-4027-b728-a687322fe844	otp.send	ibrahimkimaro01@gmail.com	{"channel": "email", "purpose": "activation", "delivery": "emailed"}	2026-10-04 16:29:55.333523+00
25f16b17-1ad6-4be8-9709-70bad0272193	b816fcfb-f11a-4027-b728-a687322fe844	otp.send	isackhaule1903@gmail.com	{"channel": "email", "purpose": "activation", "delivery": "emailed"}	2026-10-04 16:34:36.047501+00
5d4deda8-41b4-47e0-a893-2d54582d7b1e	b816fcfb-f11a-4027-b728-a687322fe844	otp.sent	377e7f85-ad4b-440b-a2f9-0c10712c0d99	{"channel": "email", "destination": "acttest-a-194198@example.invalid"}	2026-10-04 18:58:03.358349+00
61903428-2265-4b1d-a758-2243c4f3c75b	b816fcfb-f11a-4027-b728-a687322fe844	otp.delete	377e7f85-ad4b-440b-a2f9-0c10712c0d99	{"purpose": "activation", "destination": "acttest-a-194198@example.invalid"}	2026-10-04 18:58:03.722067+00
49894ed3-23db-45c6-b835-00b80ce4faf6	b816fcfb-f11a-4027-b728-a687322fe844	otp.clear	finished	{"removed": 20}	2026-10-04 18:58:03.783974+00
\.


--
-- Data for Name: alembic_version; Type: TABLE DATA; Schema: public; Owner: ibrahim_kimaro
--

COPY public.alembic_version (version_num) FROM stdin;
d1f3b5c7e9a8
\.


--
-- Data for Name: blocked_ips; Type: TABLE DATA; Schema: public; Owner: ibrahim_kimaro
--

COPY public.blocked_ips (ip, reason, blocked_by, expires_at, created_at) FROM stdin;
\.


--
-- Data for Name: broadcasts; Type: TABLE DATA; Schema: public; Owner: ibrahim_kimaro
--

COPY public.broadcasts (id, admin_id, channel, segment, subject, body, recipients, delivery, created_at, user_ids, failed) FROM stdin;
f0d748f7-c3b5-4ec1-82b6-731ced3039d4	b816fcfb-f11a-4027-b728-a687322fe844	in_app	selected	Test: maintenance tonight	Short downtime at 22:00.	2	delivered	2026-10-04 09:34:44.129597+00	["4127ed3b-5082-40be-86f0-26378e369a92", "0f7bba62-356f-404a-b67c-f6300ed3a806"]	0
3a1bd9f8-3e79-4cf5-9ede-93117b85adff	b816fcfb-f11a-4027-b728-a687322fe844	email	selected	Home Proofolio: test message from Admin	Hello!\n\nThis is a test of the new email sending from the admin Messages screen.\nNo action needed.	1	sent	2026-10-04 10:25:02.49304+00	["0f7bba62-356f-404a-b67c-f6300ed3a806"]	0
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
-- Data for Name: chat_clears; Type: TABLE DATA; Schema: public; Owner: ibrahim_kimaro
--

COPY public.chat_clears (user_id, topic, up_to, cleared_at) FROM stdin;
e6d8ab26-f0d1-415d-84a1-263fba7aade8	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_e6d8ab26-f0d1-415d-84a1-263fba7aade8	410	2026-10-04 18:16:39.126931+00
0442e5cd-e4b7-449d-ae56-8bac0028b958	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_08ecf6ff-fc6b-4453-a969-e2017e76af3b	152	2026-10-04 18:46:07.401052+00
\.


--
-- Data for Name: chat_group_members; Type: TABLE DATA; Schema: public; Owner: ibrahim_kimaro
--

COPY public.chat_group_members (group_id, user_id, role, status, invited_by, created_at, joined_at) FROM stdin;
1112a835-87f1-402a-9a46-7b786079bb8f	0442e5cd-e4b7-449d-ae56-8bac0028b958	admin	member	0442e5cd-e4b7-449d-ae56-8bac0028b958	2026-10-03 12:18:31.683048+00	2026-10-03 12:18:31.732403+00
1112a835-87f1-402a-9a46-7b786079bb8f	b816fcfb-f11a-4027-b728-a687322fe844	member	member	0442e5cd-e4b7-449d-ae56-8bac0028b958	2026-10-03 16:53:35.194687+00	2026-10-03 16:53:45.143901+00
\.


--
-- Data for Name: chat_groups; Type: TABLE DATA; Schema: public; Owner: ibrahim_kimaro
--

COPY public.chat_groups (id, slug, name, topic, created_by, created_at, avatar_url) FROM stdin;
1112a835-87f1-402a-9a46-7b786079bb8f	testing-group-af6fc4	Testing group	Real update group chata	0442e5cd-e4b7-449d-ae56-8bac0028b958	2026-10-03 12:18:31.683048+00	\N
\.


--
-- Data for Name: chat_messages; Type: TABLE DATA; Schema: public; Owner: ibrahim_kimaro
--

COPY public.chat_messages (id, client_id, topic, author_id, author_name, author_username, body, reply_to, inserted_at, recipient_id, read_at, attachment, edited_at, deleted_at) FROM stdin;
1	684ea654-e008-414a-a4ee-39267f5e0131	direct:104fa91b-9a67-40fc-8a4c-453e9b380ef8_b816fcfb-f11a-4027-b728-a687322fe844	104fa91b-9a67-40fc-8a4c-453e9b380ef8	tamimu hamisi	dr-baris	hello sir.	\N	2026-10-03 07:27:03.156449+00	b816fcfb-f11a-4027-b728-a687322fe844	2026-10-03 07:27:17.203429+00	\N	\N	\N
2	1791012444676-kr0xdo6dncr	direct:104fa91b-9a67-40fc-8a4c-453e9b380ef8_b816fcfb-f11a-4027-b728-a687322fe844	b816fcfb-f11a-4027-b728-a687322fe844	Home Proofolio	home_proofolio	yes welcome	\N	2026-10-03 07:27:24.678434+00	104fa91b-9a67-40fc-8a4c-453e9b380ef8	2026-10-03 07:27:24.695693+00	\N	\N	\N
124	1791124887141-fhcsdijtx88	direct:08eb4d91-9de2-4856-9adc-0b59f1d8074e_b816fcfb-f11a-4027-b728-a687322fe844	b816fcfb-f11a-4027-b728-a687322fe844	Home Proofolio	home_proofolio	yes	\N	2026-10-04 14:41:27.143047+00	08eb4d91-9de2-4856-9adc-0b59f1d8074e	2026-10-04 14:41:27.546038+00	\N	\N	\N
127	761a6857-c7dc-4104-b02c-a084c6f1c746	direct:08eb4d91-9de2-4856-9adc-0b59f1d8074e_b816fcfb-f11a-4027-b728-a687322fe844	08eb4d91-9de2-4856-9adc-0b59f1d8074e	Kimmy · G-5452	guest_kimmy-5452	Hi! I couldn't find my kind of work in the list. Could you please add it?	\N	2026-10-04 14:45:52.830144+00	b816fcfb-f11a-4027-b728-a687322fe844	2026-10-04 14:46:09.708242+00	\N	\N	\N
130	8e57c4f4-c973-4c69-ade1-8cb83f5507b0	direct:08eb4d91-9de2-4856-9adc-0b59f1d8074e_b816fcfb-f11a-4027-b728-a687322fe844	08eb4d91-9de2-4856-9adc-0b59f1d8074e	Kimmy · G-5452	guest_kimmy-5452	Hi! I couldn't find my kind of work in the list. Could you please add it?	\N	2026-10-04 14:46:36.920907+00	b816fcfb-f11a-4027-b728-a687322fe844	2026-10-04 14:46:36.927758+00	\N	\N	\N
131	2246619f-4799-4ee0-9021-9b79e359850e	direct:08eb4d91-9de2-4856-9adc-0b59f1d8074e_b816fcfb-f11a-4027-b728-a687322fe844	08eb4d91-9de2-4856-9adc-0b59f1d8074e	Kimmy · G-5452	guest_kimmy-5452	Ethical hacking	\N	2026-10-04 14:47:14.787384+00	b816fcfb-f11a-4027-b728-a687322fe844	2026-10-04 14:47:14.806047+00	\N	\N	\N
122	1791124219317-i20ot93lwg	direct:7badeb71-35ad-4d23-8cf2-3f7a0f90bd0c_b816fcfb-f11a-4027-b728-a687322fe844	7badeb71-35ad-4d23-8cf2-3f7a0f90bd0c	Sukka · G-40A0	guest_guest-17	Hu	\N	2026-10-04 14:30:20.056006+00	b816fcfb-f11a-4027-b728-a687322fe844	2026-10-04 16:10:27.304579+00	\N	\N	\N
135	c19ee3e7-f487-4c0c-916f-aead7053f28a	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_7dd010d7-164d-4879-ba77-da00faf76756	0442e5cd-e4b7-449d-ae56-8bac0028b958	Ibrahim Issa Kimaro	therealkimmy	subiri kwanza	\N	2026-10-04 16:15:31.327441+00	7dd010d7-164d-4879-ba77-da00faf76756	2026-10-04 16:15:31.827358+00	\N	\N	\N
138	779bc572-3344-4857-be9f-acf176fc2dda	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_7dd010d7-164d-4879-ba77-da00faf76756	7dd010d7-164d-4879-ba77-da00faf76756	Isack corleone 	isack-corleone	Unyama sana mwanangu 😂 hapo juu kina appear unyama sana	\N	2026-10-04 16:16:16.53426+00	0442e5cd-e4b7-449d-ae56-8bac0028b958	2026-10-04 16:16:16.848313+00	\N	\N	\N
140	64fb5c5d-ec21-463d-b20c-d4ce40db4d3b	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_7dd010d7-164d-4879-ba77-da00faf76756	0442e5cd-e4b7-449d-ae56-8bac0028b958	Ibrahim Issa Kimaro	therealkimmy	haha nipo tunazidi cook issue	{"id": "138", "text": "Unyama sana mwanangu 😂 hapo juu kina appear unyama sana", "author_id": "7dd010d7-164d-4879-ba77-da00faf76756", "author_name": "Isack corleone "}	2026-10-04 16:16:39.957057+00	7dd010d7-164d-4879-ba77-da00faf76756	2026-10-04 16:16:42.970502+00	\N	\N	\N
143	c9608f29-4416-4eff-950a-0fda94163eca	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_7dd010d7-164d-4879-ba77-da00faf76756	0442e5cd-e4b7-449d-ae56-8bac0028b958	Ibrahim Issa Kimaro	therealkimmy	ila email c umepa kwenye gmail??	\N	2026-10-04 16:17:41.320537+00	7dd010d7-164d-4879-ba77-da00faf76756	2026-10-04 16:17:41.781148+00	\N	\N	\N
144	b7a6ed62-ab88-4026-b4bf-9ff6408a274c	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_7dd010d7-164d-4879-ba77-da00faf76756	0442e5cd-e4b7-449d-ae56-8bac0028b958	Ibrahim Issa Kimaro	therealkimmy	nipihie	\N	2026-10-04 16:18:30.658877+00	7dd010d7-164d-4879-ba77-da00faf76756	2026-10-04 16:18:51.300152+00	\N	\N	\N
147	dacd33cf-0759-4186-b273-33803c9d08a0	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_7dd010d7-164d-4879-ba77-da00faf76756	7dd010d7-164d-4879-ba77-da00faf76756	Isack corleone 	isack-corleone	Code haiji kwenye email yangu	\N	2026-10-04 16:19:59.476752+00	0442e5cd-e4b7-449d-ae56-8bac0028b958	2026-10-04 16:19:59.978674+00	\N	\N	\N
150	279b1d3a-2210-40b0-8edc-1a6f96a7af73	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_7dd010d7-164d-4879-ba77-da00faf76756	7dd010d7-164d-4879-ba77-da00faf76756	Isack corleone 	isack-corleone	Email yangu official kabisa	\N	2026-10-04 16:21:13.470814+00	0442e5cd-e4b7-449d-ae56-8bac0028b958	2026-10-04 16:21:14.855698+00	\N	\N	\N
152	6e9d9ebc-9249-41cf-8b95-5b700a4ce37d	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_08ecf6ff-fc6b-4453-a969-e2017e76af3b	0442e5cd-e4b7-449d-ae56-8bac0028b958	Ibrahim Issa Kimaro	therealkimmy	oy saidi	\N	2026-10-04 16:23:52.491914+00	08ecf6ff-fc6b-4453-a969-e2017e76af3b	\N	\N	\N	\N
20	27cfdca5-fc60-47bb-830b-60f0cd18cf71	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_104fa91b-9a67-40fc-8a4c-453e9b380ef8	104fa91b-9a67-40fc-8a4c-453e9b380ef8	Dr. Tamimu Hamisi	dr-baris	oyaa	\N	2026-10-03 09:05:04.005022+00	0442e5cd-e4b7-449d-ae56-8bac0028b958	2026-10-03 09:05:06.99024+00	\N	\N	\N
21	1791018308056-gcnvgmd8t85	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_104fa91b-9a67-40fc-8a4c-453e9b380ef8	0442e5cd-e4b7-449d-ae56-8bac0028b958	Ibrahim Issa Kimaro	therealkimmy	Niadje	\N	2026-10-03 09:05:12.247497+00	104fa91b-9a67-40fc-8a4c-453e9b380ef8	2026-10-03 09:05:12.288036+00	\N	\N	\N
22	0333c4b5-e424-4e9b-88c2-6ac6073ce663	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_104fa91b-9a67-40fc-8a4c-453e9b380ef8	104fa91b-9a67-40fc-8a4c-453e9b380ef8	Dr. Tamimu Hamisi	dr-baris	kama kawa	\N	2026-10-03 09:05:28.9987+00	0442e5cd-e4b7-449d-ae56-8bac0028b958	2026-10-03 09:05:29.086195+00	\N	\N	\N
23	1791020586344-7skns559ksd	room:testing-group	0442e5cd-e4b7-449d-ae56-8bac0028b958	Ibrahim Issa Kimaro	therealkimmy	Hi	\N	2026-10-03 09:43:10.600104+00	\N	\N	\N	\N	\N
24	b79ea052-bd21-4065-ade1-789a74229dab	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_104fa91b-9a67-40fc-8a4c-453e9b380ef8	104fa91b-9a67-40fc-8a4c-453e9b380ef8	Dr. Tamimu Hamisi	dr-baris	subiri	\N	2026-10-03 09:50:17.599962+00	0442e5cd-e4b7-449d-ae56-8bac0028b958	2026-10-03 09:50:17.689636+00	\N	\N	\N
25	486faae0-e17e-44b0-a32d-2785802f77e5	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_104fa91b-9a67-40fc-8a4c-453e9b380ef8	104fa91b-9a67-40fc-8a4c-453e9b380ef8	Dr. Tamimu Hamisi	dr-baris	unaona iyo message ??	\N	2026-10-03 09:50:24.619982+00	0442e5cd-e4b7-449d-ae56-8bac0028b958	2026-10-03 09:50:24.734396+00	\N	\N	\N
26	4fd396bf-c9b7-41f8-8f55-c3fea892ad89	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_104fa91b-9a67-40fc-8a4c-453e9b380ef8	104fa91b-9a67-40fc-8a4c-453e9b380ef8	Dr. Tamimu Hamisi	dr-baris	nijibu kwa message	\N	2026-10-03 09:50:35.079249+00	0442e5cd-e4b7-449d-ae56-8bac0028b958	2026-10-03 09:50:35.1729+00	\N	\N	\N
27	e104ae4c-2f4a-48bc-8ae1-56feff7ac892	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_104fa91b-9a67-40fc-8a4c-453e9b380ef8	104fa91b-9a67-40fc-8a4c-453e9b380ef8	Dr. Tamimu Hamisi	dr-baris	tuma message	\N	2026-10-03 09:50:46.840342+00	0442e5cd-e4b7-449d-ae56-8bac0028b958	2026-10-03 09:50:46.925905+00	\N	\N	\N
28	21d2682f-4ff8-4870-96ec-d9789502786b	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_104fa91b-9a67-40fc-8a4c-453e9b380ef8	104fa91b-9a67-40fc-8a4c-453e9b380ef8	Dr. Tamimu Hamisi	dr-baris	🔥 jatibu kuchat hapo hapo unapooona	\N	2026-10-03 09:51:09.893617+00	0442e5cd-e4b7-449d-ae56-8bac0028b958	2026-10-03 09:51:09.992812+00	\N	\N	\N
29	1791021134408-9l6nhkbz8li	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_104fa91b-9a67-40fc-8a4c-453e9b380ef8	0442e5cd-e4b7-449d-ae56-8bac0028b958	Ibrahim Issa Kimaro	therealkimmy	Aya	\N	2026-10-03 09:52:18.687739+00	104fa91b-9a67-40fc-8a4c-453e9b380ef8	2026-10-03 09:52:18.738559+00	\N	\N	\N
30	73ea08eb-b80e-46ff-a2cb-093f1d9d99a5	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_104fa91b-9a67-40fc-8a4c-453e9b380ef8	104fa91b-9a67-40fc-8a4c-453e9b380ef8	Dr. Tamimu Hamisi	dr-baris	apo unaona?	\N	2026-10-03 09:52:34.227726+00	0442e5cd-e4b7-449d-ae56-8bac0028b958	2026-10-03 09:52:34.278745+00	\N	\N	\N
31	1791021162184-7mxedgyey5k	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_104fa91b-9a67-40fc-8a4c-453e9b380ef8	0442e5cd-e4b7-449d-ae56-8bac0028b958	Ibrahim Issa Kimaro	therealkimmy	Ndiyo	\N	2026-10-03 09:52:46.455632+00	104fa91b-9a67-40fc-8a4c-453e9b380ef8	2026-10-03 09:52:46.500615+00	\N	\N	\N
32	c44405c5-e12a-4cf9-b2d4-fc730f096d1f	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_104fa91b-9a67-40fc-8a4c-453e9b380ef8	104fa91b-9a67-40fc-8a4c-453e9b380ef8	Dr. Tamimu Hamisi	dr-baris	nataka nikupigie	\N	2026-10-03 09:52:54.701231+00	0442e5cd-e4b7-449d-ae56-8bac0028b958	2026-10-03 09:52:54.7587+00	\N	\N	\N
33	626439ce-9318-4ce2-9f05-639826f698ff	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_104fa91b-9a67-40fc-8a4c-453e9b380ef8	104fa91b-9a67-40fc-8a4c-453e9b380ef8	Dr. Tamimu Hamisi	dr-baris	alafu upoke sawa tuonge	\N	2026-10-03 09:53:01.644762+00	0442e5cd-e4b7-449d-ae56-8bac0028b958	2026-10-03 09:53:01.71158+00	\N	\N	\N
34	1791021179988-c35dicpmqc	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_104fa91b-9a67-40fc-8a4c-453e9b380ef8	0442e5cd-e4b7-449d-ae56-8bac0028b958	Ibrahim Issa Kimaro	therealkimmy	Sawa	\N	2026-10-03 09:53:04.246251+00	104fa91b-9a67-40fc-8a4c-453e9b380ef8	2026-10-03 09:53:04.29952+00	\N	\N	\N
46	1791021372891-a4lnjtka8db	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_104fa91b-9a67-40fc-8a4c-453e9b380ef8	0442e5cd-e4b7-449d-ae56-8bac0028b958	Ibrahim Issa Kimaro	therealkimmy	Wewe je	\N	2026-10-03 09:56:17.15158+00	104fa91b-9a67-40fc-8a4c-453e9b380ef8	2026-10-03 09:56:18.171629+00	\N	\N	\N
35	2ced57e0-8b59-4489-8b68-8aea718a184b	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_104fa91b-9a67-40fc-8a4c-453e9b380ef8	104fa91b-9a67-40fc-8a4c-453e9b380ef8	Dr. Tamimu Hamisi	dr-baris	mbona umekata	\N	2026-10-03 09:53:19.385545+00	0442e5cd-e4b7-449d-ae56-8bac0028b958	2026-10-03 09:53:19.404358+00	\N	\N	\N
37	1791021205537-weyutl5int	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_104fa91b-9a67-40fc-8a4c-453e9b380ef8	0442e5cd-e4b7-449d-ae56-8bac0028b958	Ibrahim Issa Kimaro	therealkimmy	Sijakata	\N	2026-10-03 09:53:29.795038+00	104fa91b-9a67-40fc-8a4c-453e9b380ef8	2026-10-03 09:53:29.844123+00	\N	\N	\N
38	af071bfc-d530-4b99-884c-70ec9a144396	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_104fa91b-9a67-40fc-8a4c-453e9b380ef8	104fa91b-9a67-40fc-8a4c-453e9b380ef8	Dr. Tamimu Hamisi	dr-baris	subiri	\N	2026-10-03 09:53:41.46451+00	0442e5cd-e4b7-449d-ae56-8bac0028b958	2026-10-03 09:53:41.532995+00	\N	\N	\N
39	1791021222419-8vf2n4yprtl	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_104fa91b-9a67-40fc-8a4c-453e9b380ef8	0442e5cd-e4b7-449d-ae56-8bac0028b958	Ibrahim Issa Kimaro	therealkimmy	Sawa	\N	2026-10-03 09:53:46.674717+00	104fa91b-9a67-40fc-8a4c-453e9b380ef8	2026-10-03 09:53:46.711155+00	\N	\N	\N
40	d739ab7a-0578-4358-ab61-808a34d163f8	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_104fa91b-9a67-40fc-8a4c-453e9b380ef8	104fa91b-9a67-40fc-8a4c-453e9b380ef8	Dr. Tamimu Hamisi	dr-baris	unabonyeza iko chekundu au cha kijani?	\N	2026-10-03 09:54:33.473565+00	0442e5cd-e4b7-449d-ae56-8bac0028b958	2026-10-03 09:54:33.569109+00	\N	\N	\N
41	1791021270222-3661rdq4lyk	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_104fa91b-9a67-40fc-8a4c-453e9b380ef8	0442e5cd-e4b7-449d-ae56-8bac0028b958	Ibrahim Issa Kimaro	therealkimmy	Inajikata	\N	2026-10-03 09:54:34.47709+00	104fa91b-9a67-40fc-8a4c-453e9b380ef8	2026-10-03 09:54:34.550169+00	\N	\N	\N
42	0ea5cfaf-b6b5-4e8a-90f6-788c3378d43c	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_104fa91b-9a67-40fc-8a4c-453e9b380ef8	104fa91b-9a67-40fc-8a4c-453e9b380ef8	Dr. Tamimu Hamisi	dr-baris	sawa jaribu kubonyeza iko chekundu	\N	2026-10-03 09:54:53.730522+00	0442e5cd-e4b7-449d-ae56-8bac0028b958	2026-10-03 09:54:53.843142+00	\N	\N	\N
43	849c46d6-dafc-4e32-bc67-94f3edba72a8	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_104fa91b-9a67-40fc-8a4c-453e9b380ef8	104fa91b-9a67-40fc-8a4c-453e9b380ef8	Dr. Tamimu Hamisi	dr-baris	subiri nijaribu kidogo	\N	2026-10-03 09:55:19.120753+00	0442e5cd-e4b7-449d-ae56-8bac0028b958	2026-10-03 09:55:19.240453+00	\N	\N	\N
44	cec69d83-7ed0-49cb-9459-d809b640995b	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_104fa91b-9a67-40fc-8a4c-453e9b380ef8	104fa91b-9a67-40fc-8a4c-453e9b380ef8	Dr. Tamimu Hamisi	dr-baris	hapo unapo chat unaona vizuri?	\N	2026-10-03 09:55:29.588836+00	0442e5cd-e4b7-449d-ae56-8bac0028b958	2026-10-03 09:55:29.68367+00	\N	\N	\N
45	1791021346779-3z8wz0t32qr	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_104fa91b-9a67-40fc-8a4c-453e9b380ef8	0442e5cd-e4b7-449d-ae56-8bac0028b958	Ibrahim Issa Kimaro	therealkimmy	Ndiyo	\N	2026-10-03 09:55:51.038892+00	104fa91b-9a67-40fc-8a4c-453e9b380ef8	2026-10-03 09:55:51.078382+00	\N	\N	\N
47	1791021384847-4i3x2489yt	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_104fa91b-9a67-40fc-8a4c-453e9b380ef8	0442e5cd-e4b7-449d-ae56-8bac0028b958	Ibrahim Issa Kimaro	therealkimmy	Unaonaje	\N	2026-10-03 09:56:29.103684+00	104fa91b-9a67-40fc-8a4c-453e9b380ef8	2026-10-03 09:56:59.430551+00	\N	\N	\N
48	1791021421319-ts0by7oat5p	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_104fa91b-9a67-40fc-8a4c-453e9b380ef8	0442e5cd-e4b7-449d-ae56-8bac0028b958	Ibrahim Issa Kimaro	therealkimmy	Vp	\N	2026-10-03 09:57:05.579624+00	104fa91b-9a67-40fc-8a4c-453e9b380ef8	2026-10-03 09:57:05.666538+00	\N	\N	\N
49	d12027de-b62d-4e58-a557-163e338a8af7	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_104fa91b-9a67-40fc-8a4c-453e9b380ef8	104fa91b-9a67-40fc-8a4c-453e9b380ef8	Dr. Tamimu Hamisi	dr-baris	haha	\N	2026-10-03 09:57:10.186653+00	0442e5cd-e4b7-449d-ae56-8bac0028b958	2026-10-03 09:57:10.259634+00	\N	\N	\N
50	6f1a1a49-3486-42e5-b7e1-8a8bac28f9da	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_104fa91b-9a67-40fc-8a4c-453e9b380ef8	104fa91b-9a67-40fc-8a4c-453e9b380ef8	Dr. Tamimu Hamisi	dr-baris	sasa mimi ndo nina tengeneza ibaidi nikuulize wewe unaonaje	\N	2026-10-03 09:57:25.630593+00	0442e5cd-e4b7-449d-ae56-8bac0028b958	2026-10-03 09:57:25.786782+00	\N	\N	\N
51	1791021441487-76mvcjnyx0y	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_104fa91b-9a67-40fc-8a4c-453e9b380ef8	0442e5cd-e4b7-449d-ae56-8bac0028b958	Ibrahim Issa Kimaro	therealkimmy	Mbonacheka	\N	2026-10-03 09:57:25.779432+00	104fa91b-9a67-40fc-8a4c-453e9b380ef8	2026-10-03 09:57:25.909706+00	\N	\N	\N
52	1791021482986-pi7d3nsee7	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_104fa91b-9a67-40fc-8a4c-453e9b380ef8	0442e5cd-e4b7-449d-ae56-8bac0028b958	Ibrahim Issa Kimaro	therealkimmy	Sawa	\N	2026-10-03 09:58:07.248232+00	104fa91b-9a67-40fc-8a4c-453e9b380ef8	2026-10-03 09:58:07.33953+00	\N	\N	\N
53	1791021519682-fmzv7w989pd	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_104fa91b-9a67-40fc-8a4c-453e9b380ef8	0442e5cd-e4b7-449d-ae56-8bac0028b958	Ibrahim Issa Kimaro	therealkimmy	Vizuri sana	\N	2026-10-03 09:58:43.947891+00	104fa91b-9a67-40fc-8a4c-453e9b380ef8	2026-10-03 09:59:52.928745+00	\N	\N	\N
54	1791021571490-12co2zibbxgf	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_104fa91b-9a67-40fc-8a4c-453e9b380ef8	0442e5cd-e4b7-449d-ae56-8bac0028b958	Ibrahim Issa Kimaro	therealkimmy	Mbonaumeacha	\N	2026-10-03 09:59:35.758206+00	104fa91b-9a67-40fc-8a4c-453e9b380ef8	2026-10-03 09:59:52.928745+00	\N	\N	\N
55	99db00d2-fc13-446f-a02b-e6725a2209fb	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_104fa91b-9a67-40fc-8a4c-453e9b380ef8	104fa91b-9a67-40fc-8a4c-453e9b380ef8	Dr. Tamimu Hamisi	dr-baris	najaribu kurekebisha subiri	\N	2026-10-03 10:00:15.090564+00	0442e5cd-e4b7-449d-ae56-8bac0028b958	2026-10-03 10:00:15.153739+00	\N	\N	\N
56	1791021617394-wj5p5tw7z4	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_104fa91b-9a67-40fc-8a4c-453e9b380ef8	0442e5cd-e4b7-449d-ae56-8bac0028b958	Ibrahim Issa Kimaro	therealkimmy	Sawa	\N	2026-10-03 10:00:21.658389+00	104fa91b-9a67-40fc-8a4c-453e9b380ef8	2026-10-03 10:00:21.763205+00	\N	\N	\N
57	sys-a0c0e3ea981f4171ac6ac4b809193352	room:testing-group-af6fc4	0442e5cd-e4b7-449d-ae56-8bac0028b958	Ibrahim Issa Kimaro	therealkimmy	Ibrahim Issa Kimaro created the group "Testing group"	\N	2026-10-03 12:18:31.683048+00	\N	\N	\N	\N	\N
62	sys-688c3c6876144c63806970620451a689	room:testing-group-af6fc4	104fa91b-9a67-40fc-8a4c-453e9b380ef8	Dr. Tamimu Hamisi	dr-baris	Dr. Tamimu Hamisi joined the group. Welcome!	\N	2026-10-03 12:36:48.311721+00	\N	\N	\N	\N	\N
63	bddd4f5c-46ea-477b-9c5e-b8f0a5d7f673	room:testing-group-af6fc4	104fa91b-9a67-40fc-8a4c-453e9b380ef8	Dr. Tamimu Hamisi	dr-baris	oy	\N	2026-10-03 12:36:52.792194+00	\N	\N	\N	\N	\N
64	0c7418f1-8cd6-453a-9932-bbc4f0d4ebe7	room:testing-group-af6fc4	104fa91b-9a67-40fc-8a4c-453e9b380ef8	Dr. Tamimu Hamisi	dr-baris	unyama	\N	2026-10-03 12:37:06.059749+00	\N	\N	\N	\N	\N
65	sys-f5edb2019126425fb882c85acd06756d	room:testing-group-af6fc4	b816fcfb-f11a-4027-b728-a687322fe844	Home Proofolio	home_proofolio	Home Proofolio joined the group. Welcome!	\N	2026-10-03 12:37:33.803224+00	\N	\N	\N	\N	\N
66	1791031179870-tyubk7viy5e	room:testing-group-af6fc4	0442e5cd-e4b7-449d-ae56-8bac0028b958	Ibrahim Issa Kimaro	therealkimmy	Habari	\N	2026-10-03 12:39:44.276683+00	\N	\N	\N	\N	\N
67	1791031200694-2azhffkap4	room:testing-group-af6fc4	b816fcfb-f11a-4027-b728-a687322fe844	Home Proofolio	home_proofolio	salmayigiiuhuiiygiiigii	\N	2026-10-03 12:40:00.696248+00	\N	\N	\N	\N	\N
68	1791031197166-ib9cpaxa27j	room:testing-group-af6fc4	0442e5cd-e4b7-449d-ae56-8bac0028b958	Ibrahim Issa Kimaro	therealkimmy	Ghhvvvvvvvv vvvdf	\N	2026-10-03 12:40:01.575192+00	\N	\N	\N	\N	\N
69	sys-aeae21a56c594896b8d9e8bd45c489b5	room:testing-group-af6fc4	b816fcfb-f11a-4027-b728-a687322fe844	Home Proofolio	home_proofolio	Home Proofolio left the group	\N	2026-10-03 12:40:14.800358+00	\N	\N	\N	\N	\N
70	1791031223526-qbfgr0apwil	room:testing-group-af6fc4	0442e5cd-e4b7-449d-ae56-8bac0028b958	Ibrahim Issa Kimaro	therealkimmy	Oyaa jama aka left group bana	\N	2026-10-03 12:40:27.934028+00	\N	\N	\N	\N	\N
71	1791031320295-k8o4md6xiw	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_104fa91b-9a67-40fc-8a4c-453e9b380ef8	0442e5cd-e4b7-449d-ae56-8bac0028b958	Ibrahim Issa Kimaro	therealkimmy	Oy	\N	2026-10-03 12:42:04.707798+00	104fa91b-9a67-40fc-8a4c-453e9b380ef8	2026-10-03 12:42:09.748104+00	\N	\N	\N
123	bdfd69dd-7fa8-4947-91b0-6c959015e112	direct:08eb4d91-9de2-4856-9adc-0b59f1d8074e_b816fcfb-f11a-4027-b728-a687322fe844	08eb4d91-9de2-4856-9adc-0b59f1d8074e	Kimmy · G-5452	guest_kimmy-5452	Hi	\N	2026-10-04 14:41:17.179322+00	b816fcfb-f11a-4027-b728-a687322fe844	2026-10-04 14:41:23.41653+00	\N	\N	\N
128	d83f2085-179c-4ae9-9ab9-53ad23370787	direct:08eb4d91-9de2-4856-9adc-0b59f1d8074e_b816fcfb-f11a-4027-b728-a687322fe844	08eb4d91-9de2-4856-9adc-0b59f1d8074e	Kimmy · G-5452	guest_kimmy-5452	Nisaidie kuangalia kazi yangu	\N	2026-10-04 14:46:04.508404+00	b816fcfb-f11a-4027-b728-a687322fe844	2026-10-04 14:46:09.708242+00	\N	\N	\N
132	17dc5269-28be-49ad-8771-4c4690a9fcfa	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_7dd010d7-164d-4879-ba77-da00faf76756	7dd010d7-164d-4879-ba77-da00faf76756	Isack corleone 	isack-corleone	Oy fam	\N	2026-10-04 16:13:48.012126+00	0442e5cd-e4b7-449d-ae56-8bac0028b958	2026-10-04 16:14:48.95748+00	\N	\N	\N
134	4076db05-7b99-4a0b-9008-aca0b73dda81	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_7dd010d7-164d-4879-ba77-da00faf76756	7dd010d7-164d-4879-ba77-da00faf76756	Isack corleone 	isack-corleone	Calls vipi	\N	2026-10-04 16:15:25.336437+00	0442e5cd-e4b7-449d-ae56-8bac0028b958	2026-10-04 16:15:25.668196+00	\N	\N	\N
136	d0715372-0635-4929-96ac-0d22a2b68dbe	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_7dd010d7-164d-4879-ba77-da00faf76756	0442e5cd-e4b7-449d-ae56-8bac0028b958	Ibrahim Issa Kimaro	therealkimmy	unaona the typing indicator	\N	2026-10-04 16:15:43.415927+00	7dd010d7-164d-4879-ba77-da00faf76756	2026-10-04 16:15:44.027476+00	\N	\N	\N
85	1791035637499-9uveonggw9	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_104fa91b-9a67-40fc-8a4c-453e9b380ef8	0442e5cd-e4b7-449d-ae56-8bac0028b958	Ibrahim Issa Kimaro	therealkimmy	Oy	\N	2026-10-03 13:53:57.424447+00	104fa91b-9a67-40fc-8a4c-453e9b380ef8	2026-10-03 13:53:57.461238+00	\N	\N	\N
86	5d6abdeb-6739-4251-8f12-73636a288272	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_104fa91b-9a67-40fc-8a4c-453e9b380ef8	104fa91b-9a67-40fc-8a4c-453e9b380ef8	Tamimu Hamisi	dr-baris	ghhh	\N	2026-10-03 13:54:03.592007+00	0442e5cd-e4b7-449d-ae56-8bac0028b958	2026-10-03 13:54:03.718181+00	\N	\N	\N
141	a7096be0-541f-4ac4-9350-9de2abe7c66a	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_7dd010d7-164d-4879-ba77-da00faf76756	0442e5cd-e4b7-449d-ae56-8bac0028b958	Ibrahim Issa Kimaro	therealkimmy	haijuaonyesha apo juu activation ya account itakua suspended kwa muda	{"id": "139", "text": "Eeeh nime create tu account bhasi", "author_id": "7dd010d7-164d-4879-ba77-da00faf76756", "author_name": "Isack corleone "}	2026-10-04 16:17:08.498531+00	7dd010d7-164d-4879-ba77-da00faf76756	2026-10-04 16:17:08.928903+00	\N	\N	\N
87	1791043795195-3dnn2s7hnc1	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_b816fcfb-f11a-4027-b728-a687322fe844	0442e5cd-e4b7-449d-ae56-8bac0028b958	Ibrahim Issa Kimaro	therealkimmy	What it’s about	\N	2026-10-03 16:09:55.436655+00	b816fcfb-f11a-4027-b728-a687322fe844	2026-10-03 16:10:24.152914+00	\N	\N	\N
88	1791043827748-rxoymtqzh2m	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_b816fcfb-f11a-4027-b728-a687322fe844	b816fcfb-f11a-4027-b728-a687322fe844	Home Proofolio	home_proofolio	ok wlecome	\N	2026-10-03 16:10:27.751252+00	0442e5cd-e4b7-449d-ae56-8bac0028b958	2026-10-03 16:10:34.45363+00	\N	\N	\N
142	ebb36f1c-84cc-48b0-bccd-257d5fdafd29	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_7dd010d7-164d-4879-ba77-da00faf76756	7dd010d7-164d-4879-ba77-da00faf76756	Isack corleone 	isack-corleone	Mwanangu unajua bhasi tu unakuaga na mapepe	{"id": "140", "text": "haha nipo tunazidi cook issue", "author_id": "0442e5cd-e4b7-449d-ae56-8bac0028b958", "author_name": "Ibrahim Issa Kimaro"}	2026-10-04 16:17:18.715174+00	0442e5cd-e4b7-449d-ae56-8bac0028b958	2026-10-04 16:17:24.687444+00	\N	\N	\N
89	1791043842814-nq3c7zgda7	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_b816fcfb-f11a-4027-b728-a687322fe844	b816fcfb-f11a-4027-b728-a687322fe844	Home Proofolio	home_proofolio	karibu nikuhudumie	\N	2026-10-03 16:10:42.817771+00	0442e5cd-e4b7-449d-ae56-8bac0028b958	2026-10-03 16:10:42.902066+00	\N	\N	\N
90	fe45c3dd-4a1c-42cd-b451-78e75e5cd1e9	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_104fa91b-9a67-40fc-8a4c-453e9b380ef8	104fa91b-9a67-40fc-8a4c-453e9b380ef8	Tamimu Hamisi	dr-baris	oya	\N	2026-10-03 16:53:08.083486+00	0442e5cd-e4b7-449d-ae56-8bac0028b958	2026-10-03 16:53:08.123365+00	\N	\N	\N
91	sys-6850acd407c24b8381f2973d5ca18e4d	room:testing-group-af6fc4	b816fcfb-f11a-4027-b728-a687322fe844	Home Proofolio	home_proofolio	Home Proofolio joined the group. Welcome!	\N	2026-10-03 16:53:45.139152+00	\N	\N	\N	\N	\N
92	1791046438593-jos203k1mi	room:testing-group-af6fc4	0442e5cd-e4b7-449d-ae56-8bac0028b958	Ibrahim Issa Kimaro	therealkimmy	Hello guys	\N	2026-10-03 16:53:58.941957+00	\N	\N	\N	\N	\N
93	1791046502180-78lcxmloxsc	room:testing-group-af6fc4	0442e5cd-e4b7-449d-ae56-8bac0028b958	Ibrahim Issa Kimaro	therealkimmy	Unaweza nitumia picha ya iyo bidhaa	\N	2026-10-03 16:55:02.478943+00	\N	\N	\N	\N	\N
94	b43a19dd-5fdd-4f8c-940e-6b49992a79ae	room:testing-group-af6fc4	104fa91b-9a67-40fc-8a4c-453e9b380ef8	Tamimu Hamisi	dr-baris	yooo	\N	2026-10-03 16:55:03.274402+00	\N	\N	\N	\N	\N
95	1791046515938-pu8bfwjks7	room:testing-group-af6fc4	b816fcfb-f11a-4027-b728-a687322fe844	Home Proofolio	home_proofolio	yes naweza ila subiria	\N	2026-10-03 16:55:15.940098+00	\N	\N	\N	\N	\N
96	1791046521545-y26qakrm69	room:testing-group-af6fc4	b816fcfb-f11a-4027-b728-a687322fe844	Home Proofolio	home_proofolio		\N	2026-10-03 16:55:21.548904+00	\N	\N	{"name": "e4b5cbaf84db4e80aa284b22b4ae659d.pdf", "size": 40672, "filename": "home_proofolio_prd_user_workflow_v0_2(1).pdf", "content_type": "application/pdf"}	\N	\N
97	3236e2b3-67a0-4cca-a97b-fd0bd1406750	room:testing-group-af6fc4	104fa91b-9a67-40fc-8a4c-453e9b380ef8	Tamimu Hamisi	dr-baris		\N	2026-10-03 16:56:03.517308+00	\N	\N	{"name": "e6c0146b4f334e99819f55cf383793d5.jpg", "size": 715470, "filename": "WhatsApp Image 2026-10-03 at 16.09.51.jpeg", "content_type": "image/jpeg"}	\N	\N
98	1791046574050-prusb92sud	room:testing-group-af6fc4	b816fcfb-f11a-4027-b728-a687322fe844	Home Proofolio	home_proofolio	ya nimeiona	\N	2026-10-03 16:56:14.051213+00	\N	\N	\N	\N	\N
99	3ada8b45-7c92-4f40-b85d-4b7e6e134137	room:testing-group-af6fc4	104fa91b-9a67-40fc-8a4c-453e9b380ef8	Tamimu Hamisi	dr-baris	umesema imekuaje	{"id": "70", "text": "Oyaa jama aka left group bana", "author_id": "0442e5cd-e4b7-449d-ae56-8bac0028b958", "author_name": "Ibrahim Issa Kimaro"}	2026-10-03 16:59:45.367586+00	\N	\N	\N	\N	\N
100	sys-0afdf38db5cb4586ab72075a2d816cad	room:testing-group-af6fc4	104fa91b-9a67-40fc-8a4c-453e9b380ef8	Tamimu Hamisi	dr-baris	Tamimu Hamisi left the group	\N	2026-10-03 17:00:56.129839+00	\N	\N	\N	\N	\N
101	5118b14e-0792-4926-a50c-26b65f95c33c	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_104fa91b-9a67-40fc-8a4c-453e9b380ef8	104fa91b-9a67-40fc-8a4c-453e9b380ef8	Tamimu Hamisi	dr-baris	oy	\N	2026-10-03 19:59:51.065264+00	0442e5cd-e4b7-449d-ae56-8bac0028b958	2026-10-03 20:02:08.529065+00	\N	\N	\N
102	b407b57a-37b0-4e1e-a8d6-7bf13b378189	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_104fa91b-9a67-40fc-8a4c-453e9b380ef8	104fa91b-9a67-40fc-8a4c-453e9b380ef8	Tamimu Hamisi	dr-baris	oy	\N	2026-10-03 20:02:15.998252+00	0442e5cd-e4b7-449d-ae56-8bac0028b958	2026-10-03 20:02:16.596164+00	\N	\N	\N
404	61002fdb-54ad-4d2d-8ee9-3404f5fa922b	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_104fa91b-9a67-40fc-8a4c-453e9b380ef8	104fa91b-9a67-40fc-8a4c-453e9b380ef8	Amina Kimaro	aminak	oya	\N	2026-10-04 17:19:20.619271+00	0442e5cd-e4b7-449d-ae56-8bac0028b958	2026-10-04 17:19:28.668461+00	\N	\N	\N
103	8e886d49-790e-4710-9481-78bc38627791	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_104fa91b-9a67-40fc-8a4c-453e9b380ef8	0442e5cd-e4b7-449d-ae56-8bac0028b958	Ibrahim Issa Kimaro	therealkimmy	Niadje	\N	2026-10-03 20:02:24.805145+00	104fa91b-9a67-40fc-8a4c-453e9b380ef8	2026-10-03 20:02:25.132653+00	\N	\N	\N
104	564379bb-834f-42e2-b02a-89829f5ce5bb	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_104fa91b-9a67-40fc-8a4c-453e9b380ef8	0442e5cd-e4b7-449d-ae56-8bac0028b958	Ibrahim Issa Kimaro	therealkimmy	Aisee	\N	2026-10-03 20:03:10.897409+00	104fa91b-9a67-40fc-8a4c-453e9b380ef8	2026-10-03 20:03:11.20925+00	\N	\N	\N
120	1791123646773-jhvkzps1g4d	direct:7badeb71-35ad-4d23-8cf2-3f7a0f90bd0c_b816fcfb-f11a-4027-b728-a687322fe844	7badeb71-35ad-4d23-8cf2-3f7a0f90bd0c	Sukka · G-40A0	guest_guest-17	Hello	\N	2026-10-04 14:20:47.580412+00	b816fcfb-f11a-4027-b728-a687322fe844	2026-10-04 14:21:35.791875+00	\N	\N	\N
121	1791123702448-vfvg8yc98z	direct:7badeb71-35ad-4d23-8cf2-3f7a0f90bd0c_b816fcfb-f11a-4027-b728-a687322fe844	b816fcfb-f11a-4027-b728-a687322fe844	Home Proofolio	home_proofolio	karibu	\N	2026-10-04 14:21:42.451745+00	7badeb71-35ad-4d23-8cf2-3f7a0f90bd0c	2026-10-04 14:30:20.038483+00	\N	\N	\N
125	1791124894662-5ghk1rctafd	direct:08eb4d91-9de2-4856-9adc-0b59f1d8074e_b816fcfb-f11a-4027-b728-a687322fe844	b816fcfb-f11a-4027-b728-a687322fe844	Home Proofolio	home_proofolio	karibu	\N	2026-10-04 14:41:34.664205+00	08eb4d91-9de2-4856-9adc-0b59f1d8074e	2026-10-04 14:41:35.090056+00	\N	\N	\N
126	ab0d4281-89f0-4ba6-87c5-0319f4097a4f	direct:08eb4d91-9de2-4856-9adc-0b59f1d8074e_b816fcfb-f11a-4027-b728-a687322fe844	08eb4d91-9de2-4856-9adc-0b59f1d8074e	Kimmy · G-5452	guest_kimmy-5452	Ahsante unaitwa nani?	\N	2026-10-04 14:41:46.766388+00	b816fcfb-f11a-4027-b728-a687322fe844	2026-10-04 14:41:46.772609+00	\N	\N	\N
129	1791125195169-nv5qcfw8w7	direct:08eb4d91-9de2-4856-9adc-0b59f1d8074e_b816fcfb-f11a-4027-b728-a687322fe844	b816fcfb-f11a-4027-b728-a687322fe844	Home Proofolio	home_proofolio	sawa unaweza kuniambia ni sehmeu gani nikuwekee	\N	2026-10-04 14:46:35.171344+00	08eb4d91-9de2-4856-9adc-0b59f1d8074e	2026-10-04 14:46:36.873652+00	\N	\N	\N
133	c74cdc08-1475-4067-91a1-5deab4d657be	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_7dd010d7-164d-4879-ba77-da00faf76756	0442e5cd-e4b7-449d-ae56-8bac0028b958	Ibrahim Issa Kimaro	therealkimmy	oy	\N	2026-10-04 16:14:50.457085+00	7dd010d7-164d-4879-ba77-da00faf76756	2026-10-04 16:15:07.061269+00	\N	\N	\N
137	8ad0184d-a527-4ff6-ab80-40382046edae	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_7dd010d7-164d-4879-ba77-da00faf76756	0442e5cd-e4b7-449d-ae56-8bac0028b958	Ibrahim Issa Kimaro	therealkimmy	usha-ctivate account??.....	\N	2026-10-04 16:16:00.561923+00	7dd010d7-164d-4879-ba77-da00faf76756	2026-10-04 16:16:01.175962+00	\N	\N	\N
139	60d094b5-637e-45b9-88a7-7daec76361c5	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_7dd010d7-164d-4879-ba77-da00faf76756	7dd010d7-164d-4879-ba77-da00faf76756	Isack corleone 	isack-corleone	Eeeh nime create tu account bhasi	{"id": "137", "text": "usha-ctivate account??.....", "author_id": "0442e5cd-e4b7-449d-ae56-8bac0028b958", "author_name": "Ibrahim Issa Kimaro"}	2026-10-04 16:16:38.463825+00	0442e5cd-e4b7-449d-ae56-8bac0028b958	2026-10-04 16:16:38.773992+00	\N	\N	\N
145	a1fab150-b64a-4975-b63d-a99bd56f4f41	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_7dd010d7-164d-4879-ba77-da00faf76756	0442e5cd-e4b7-449d-ae56-8bac0028b958	Ibrahim Issa Kimaro	therealkimmy	nipigie	\N	2026-10-04 16:18:35.084786+00	7dd010d7-164d-4879-ba77-da00faf76756	2026-10-04 16:18:51.300152+00	\N	\N	\N
146	58703842-88e5-4eae-844f-b8448f417017	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_7dd010d7-164d-4879-ba77-da00faf76756	0442e5cd-e4b7-449d-ae56-8bac0028b958	Ibrahim Issa Kimaro	therealkimmy	jaribu kupiga tena	\N	2026-10-04 16:19:49.259027+00	7dd010d7-164d-4879-ba77-da00faf76756	2026-10-04 16:19:49.984675+00	\N	\N	\N
148	4bef1f66-bc2f-45f8-b898-692e2e19a9c3	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_7dd010d7-164d-4879-ba77-da00faf76756	0442e5cd-e4b7-449d-ae56-8bac0028b958	Ibrahim Issa Kimaro	therealkimmy	dooh	\N	2026-10-04 16:20:47.07772+00	7dd010d7-164d-4879-ba77-da00faf76756	2026-10-04 16:20:47.52678+00	\N	\N	\N
149	9d60f794-ca55-4d2a-9654-d6cc7a003deb	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_7dd010d7-164d-4879-ba77-da00faf76756	0442e5cd-e4b7-449d-ae56-8bac0028b958	Ibrahim Issa Kimaro	therealkimmy	au umeweka email sio	\N	2026-10-04 16:20:52.448082+00	7dd010d7-164d-4879-ba77-da00faf76756	2026-10-04 16:20:52.894394+00	\N	\N	\N
151	76855e07-23e1-4a81-b2e5-06f44bbf0598	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_7dd010d7-164d-4879-ba77-da00faf76756	0442e5cd-e4b7-449d-ae56-8bac0028b958	Ibrahim Issa Kimaro	therealkimmy	subiri nilikua nagonga kwa tetsing sija build haha	\N	2026-10-04 16:21:25.946507+00	7dd010d7-164d-4879-ba77-da00faf76756	\N	\N	\N	\N
153	bca9869f-3e4b-4492-84d8-1f133d1babf0	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_104fa91b-9a67-40fc-8a4c-453e9b380ef8	0442e5cd-e4b7-449d-ae56-8bac0028b958	Ibrahim Issa Kimaro	therealkimmy	Hey	\N	2026-10-04 16:33:18.860475+00	104fa91b-9a67-40fc-8a4c-453e9b380ef8	2026-10-04 16:33:18.916691+00	\N	\N	\N
405	1791134378365-uplw5vf73ym	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_104fa91b-9a67-40fc-8a4c-453e9b380ef8	0442e5cd-e4b7-449d-ae56-8bac0028b958	Ibrahim Issa Kimaro	therealkimmy	Bipi	\N	2026-10-04 17:19:39.102734+00	104fa91b-9a67-40fc-8a4c-453e9b380ef8	2026-10-04 17:19:39.193082+00	\N	\N	\N
406	ec3ee55f-3ebe-4159-94b4-3ee0d1ff2fef	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_104fa91b-9a67-40fc-8a4c-453e9b380ef8	104fa91b-9a67-40fc-8a4c-453e9b380ef8	Amina Kimaro	aminak	inakuaje	\N	2026-10-04 17:20:01.305663+00	0442e5cd-e4b7-449d-ae56-8bac0028b958	2026-10-04 17:20:21.115387+00	\N	\N	\N
408	1791134431589-fpkpbif2xee	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_104fa91b-9a67-40fc-8a4c-453e9b380ef8	0442e5cd-e4b7-449d-ae56-8bac0028b958	Ibrahim Issa Kimaro	therealkimmy	Vipi	\N	2026-10-04 17:20:32.287786+00	104fa91b-9a67-40fc-8a4c-453e9b380ef8	2026-10-04 17:20:41.899464+00	\N	\N	\N
409	ad9373c2-60bc-4e37-99f9-099873ba759f	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_104fa91b-9a67-40fc-8a4c-453e9b380ef8	104fa91b-9a67-40fc-8a4c-453e9b380ef8	Amina Kimaro	aminak	safi	\N	2026-10-04 17:20:57.265998+00	0442e5cd-e4b7-449d-ae56-8bac0028b958	2026-10-04 17:21:21.787702+00	\N	\N	\N
410	35d590b8-c9a3-48a9-9dbd-20f5b303fae3	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_e6d8ab26-f0d1-415d-84a1-263fba7aade8	0442e5cd-e4b7-449d-ae56-8bac0028b958	Ibrahim Issa Kimaro	therealkimmy	oy	\N	2026-10-04 17:22:56.183929+00	e6d8ab26-f0d1-415d-84a1-263fba7aade8	2026-10-04 17:46:08.453837+00	\N	\N	\N
424	83c4eeaa-2f46-4ec8-9eda-1bbb618650de	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_e6d8ab26-f0d1-415d-84a1-263fba7aade8	0442e5cd-e4b7-449d-ae56-8bac0028b958	Ibrahim Issa Kimaro	therealkimmy	oy	\N	2026-10-04 18:17:09.021471+00	e6d8ab26-f0d1-415d-84a1-263fba7aade8	2026-10-04 18:17:28.528003+00	\N	\N	\N
429	a7d6a74c-1cc5-480f-80ca-406070701bae	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_104fa91b-9a67-40fc-8a4c-453e9b380ef8	0442e5cd-e4b7-449d-ae56-8bac0028b958	Ibrahim Issa Kimaro	therealkimmy	amina	\N	2026-10-04 18:24:29.508308+00	104fa91b-9a67-40fc-8a4c-453e9b380ef8	2026-10-04 18:24:34.15318+00	\N	\N	\N
440	60fafce0-61d4-4ce2-92b4-db2ca6a78ad7	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_e6d8ab26-f0d1-415d-84a1-263fba7aade8	0442e5cd-e4b7-449d-ae56-8bac0028b958	Ibrahim Issa Kimaro	therealkimmy	yes	\N	2026-10-04 18:25:37.516989+00	e6d8ab26-f0d1-415d-84a1-263fba7aade8	2026-10-04 18:25:39.823717+00	\N	\N	\N
442	1791138397048-g7qwm2qx5vr	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_b816fcfb-f11a-4027-b728-a687322fe844	b816fcfb-f11a-4027-b728-a687322fe844	Home Proofolio	home_proofolio	vipi	\N	2026-10-04 18:26:37.046432+00	0442e5cd-e4b7-449d-ae56-8bac0028b958	2026-10-04 18:26:40.16957+00	\N	\N	\N
433	eb0fc183-da8e-4ce5-bd5d-68ab3f1b887e	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_104fa91b-9a67-40fc-8a4c-453e9b380ef8	0442e5cd-e4b7-449d-ae56-8bac0028b958	Ibrahim Issa Kimaro	therealkimmy	haha	\N	2026-10-04 18:24:52.40443+00	104fa91b-9a67-40fc-8a4c-453e9b380ef8	2026-10-04 18:44:27.515079+00	\N	\N	\N
426	03e1d438-889c-4a2e-b278-5dc0dbfab647	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_e6d8ab26-f0d1-415d-84a1-263fba7aade8	0442e5cd-e4b7-449d-ae56-8bac0028b958	Ibrahim Issa Kimaro	therealkimmy		\N	2026-10-04 18:17:40.147183+00	e6d8ab26-f0d1-415d-84a1-263fba7aade8	2026-10-04 18:17:57.024003+00	\N	\N	2026-10-04 18:22:35.253591+00
425	951eccef-1377-4a47-a45c-dd6c692bedc2	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_e6d8ab26-f0d1-415d-84a1-263fba7aade8	0442e5cd-e4b7-449d-ae56-8bac0028b958	Ibrahim Issa Kimaro	therealkimmy		\N	2026-10-04 18:17:32.990473+00	e6d8ab26-f0d1-415d-84a1-263fba7aade8	2026-10-04 18:17:33.574325+00	\N	\N	2026-10-04 18:22:58.101763+00
427	a716b1fb-ae26-43af-be55-19a1890d300d	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_e6d8ab26-f0d1-415d-84a1-263fba7aade8	0442e5cd-e4b7-449d-ae56-8bac0028b958	Ibrahim Issa Kimaro	therealkimmy	sikia	{"id": "424", "text": "oy", "author_id": "0442e5cd-e4b7-449d-ae56-8bac0028b958", "author_name": "Ibrahim Issa Kimaro"}	2026-10-04 18:23:07.316102+00	e6d8ab26-f0d1-415d-84a1-263fba7aade8	2026-10-04 18:23:07.680986+00	\N	\N	\N
428	e1389125-59fb-42c4-89b2-9c09b8b5f948	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_e6d8ab26-f0d1-415d-84a1-263fba7aade8	e6d8ab26-f0d1-415d-84a1-263fba7aade8	Sean wallace 	sean-wallace	Niambie kabisa	\N	2026-10-04 18:23:12.91685+00	0442e5cd-e4b7-449d-ae56-8bac0028b958	2026-10-04 18:23:13.313304+00	\N	2026-10-04 18:23:29.93368+00	\N
431	dfb6c0dd-0358-41dd-9060-08243b544777	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_104fa91b-9a67-40fc-8a4c-453e9b380ef8	104fa91b-9a67-40fc-8a4c-453e9b380ef8	Amina Kimaro	aminak	yes	\N	2026-10-04 18:24:38.03934+00	0442e5cd-e4b7-449d-ae56-8bac0028b958	2026-10-04 18:24:41.276474+00	\N	\N	\N
432	9515c938-22d1-40db-90c5-62d81f790cbb	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_104fa91b-9a67-40fc-8a4c-453e9b380ef8	0442e5cd-e4b7-449d-ae56-8bac0028b958	Ibrahim Issa Kimaro	therealkimmy	sawa	\N	2026-10-04 18:24:45.571499+00	104fa91b-9a67-40fc-8a4c-453e9b380ef8	2026-10-04 18:24:47.323553+00	\N	\N	\N
434	2d2f0433-757d-4a6f-8360-ee0d42896719	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_e6d8ab26-f0d1-415d-84a1-263fba7aade8	0442e5cd-e4b7-449d-ae56-8bac0028b958	Ibrahim Issa Kimaro	therealkimmy	oyaa	\N	2026-10-04 18:25:01.102133+00	e6d8ab26-f0d1-415d-84a1-263fba7aade8	2026-10-04 18:25:17.154939+00	\N	\N	\N
445	1791138425209-8b6w02jwqg	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_b816fcfb-f11a-4027-b728-a687322fe844	b816fcfb-f11a-4027-b728-a687322fe844	Home Proofolio	home_proofolio	oy	\N	2026-10-04 18:27:05.211093+00	0442e5cd-e4b7-449d-ae56-8bac0028b958	2026-10-04 18:27:07.407172+00	\N	\N	\N
435	cb14cf9d-208b-444e-a312-98787c4f0b89	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_e6d8ab26-f0d1-415d-84a1-263fba7aade8	e6d8ab26-f0d1-415d-84a1-263fba7aade8	Sean wallace 	sean-wallace	Oy	\N	2026-10-04 18:25:17.136749+00	0442e5cd-e4b7-449d-ae56-8bac0028b958	2026-10-04 18:25:18.253661+00	\N	\N	\N
437	aabdc768-08d4-43ec-bad4-a437967f6d37	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_e6d8ab26-f0d1-415d-84a1-263fba7aade8	e6d8ab26-f0d1-415d-84a1-263fba7aade8	Sean wallace 	sean-wallace	Oy	\N	2026-10-04 18:25:29.814934+00	0442e5cd-e4b7-449d-ae56-8bac0028b958	2026-10-04 18:25:30.161771+00	\N	\N	\N
439	a8d34c73-1e17-4581-ac50-02a4dbb36a31	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_e6d8ab26-f0d1-415d-84a1-263fba7aade8	e6d8ab26-f0d1-415d-84a1-263fba7aade8	Sean wallace 	sean-wallace	Oy	\N	2026-10-04 18:25:35.034746+00	0442e5cd-e4b7-449d-ae56-8bac0028b958	2026-10-04 18:25:35.703966+00	\N	\N	\N
441	4908f470-2d74-4626-b69c-e75bf5ea9075	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_b816fcfb-f11a-4027-b728-a687322fe844	0442e5cd-e4b7-449d-ae56-8bac0028b958	Ibrahim Issa Kimaro	therealkimmy	oya	\N	2026-10-04 18:26:29.131288+00	b816fcfb-f11a-4027-b728-a687322fe844	2026-10-04 18:26:34.377909+00	\N	\N	\N
443	27cd186b-b8a2-4886-aa0e-aea285d1e95b	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_b816fcfb-f11a-4027-b728-a687322fe844	0442e5cd-e4b7-449d-ae56-8bac0028b958	Ibrahim Issa Kimaro	therealkimmy	shwari	\N	2026-10-04 18:26:47.378704+00	b816fcfb-f11a-4027-b728-a687322fe844	2026-10-04 18:26:47.399771+00	\N	\N	\N
444	1791138413719-s78wvmg2o8b	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_b816fcfb-f11a-4027-b728-a687322fe844	b816fcfb-f11a-4027-b728-a687322fe844	Home Proofolio	home_proofolio	kama kawa	\N	2026-10-04 18:26:53.720247+00	0442e5cd-e4b7-449d-ae56-8bac0028b958	2026-10-04 18:26:58.701102+00	\N	\N	\N
446	1791138464795-nt8y0x0zde	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_b816fcfb-f11a-4027-b728-a687322fe844	b816fcfb-f11a-4027-b728-a687322fe844	Home Proofolio	home_proofolio	Vipi	\N	2026-10-04 18:27:45.164355+00	0442e5cd-e4b7-449d-ae56-8bac0028b958	2026-10-04 18:27:45.555154+00	\N	\N	\N
447	ce0cdb95-8eab-4516-a84a-20f853ba0909	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_b816fcfb-f11a-4027-b728-a687322fe844	0442e5cd-e4b7-449d-ae56-8bac0028b958	Ibrahim Issa Kimaro	therealkimmy	yes	\N	2026-10-04 18:27:54.642351+00	b816fcfb-f11a-4027-b728-a687322fe844	2026-10-04 18:27:54.64854+00	\N	\N	\N
448	d54f6d60-7f99-4e98-b3e9-2f667770e929	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_e6d8ab26-f0d1-415d-84a1-263fba7aade8	e6d8ab26-f0d1-415d-84a1-263fba7aade8	Sean wallace 	sean-wallace	Hi	\N	2026-10-04 18:28:10.581667+00	0442e5cd-e4b7-449d-ae56-8bac0028b958	2026-10-04 18:28:14.352329+00	\N	\N	\N
450	ef4b3854-5d8e-43a4-9a0e-5426d993b742	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_e6d8ab26-f0d1-415d-84a1-263fba7aade8	0442e5cd-e4b7-449d-ae56-8bac0028b958	Ibrahim Issa Kimaro	therealkimmy	yes	\N	2026-10-04 18:28:16.351536+00	e6d8ab26-f0d1-415d-84a1-263fba7aade8	2026-10-04 18:28:22.432916+00	\N	\N	\N
451	d4bcc41c-03da-4f5e-90e4-e2dab288b565	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_e6d8ab26-f0d1-415d-84a1-263fba7aade8	e6d8ab26-f0d1-415d-84a1-263fba7aade8	Sean wallace 	sean-wallace	Kama kawa	\N	2026-10-04 18:28:30.064611+00	0442e5cd-e4b7-449d-ae56-8bac0028b958	2026-10-04 18:28:30.745707+00	\N	\N	\N
452	8ce1e77d-0262-4586-9874-130f47cdd436	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_e6d8ab26-f0d1-415d-84a1-263fba7aade8	0442e5cd-e4b7-449d-ae56-8bac0028b958	Ibrahim Issa Kimaro	therealkimmy	shoo	\N	2026-10-04 18:28:37.035835+00	e6d8ab26-f0d1-415d-84a1-263fba7aade8	2026-10-04 18:28:38.317336+00	\N	\N	\N
453	de0b909e-59aa-44b9-b946-495372038b87	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_e6d8ab26-f0d1-415d-84a1-263fba7aade8	e6d8ab26-f0d1-415d-84a1-263fba7aade8	Sean wallace 	sean-wallace	Vipi hali	\N	2026-10-04 18:28:44.555416+00	0442e5cd-e4b7-449d-ae56-8bac0028b958	2026-10-04 18:28:47.678785+00	\N	\N	\N
454	1534b65f-c499-4d7a-bd94-0ec1e7205604	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_e6d8ab26-f0d1-415d-84a1-263fba7aade8	0442e5cd-e4b7-449d-ae56-8bac0028b958	Ibrahim Issa Kimaro	therealkimmy	salama	\N	2026-10-04 18:28:58.584417+00	e6d8ab26-f0d1-415d-84a1-263fba7aade8	2026-10-04 18:29:09.860107+00	\N	\N	\N
455	4a2cc7cf-3cfb-47ee-8778-72c7e88a029c	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_e6d8ab26-f0d1-415d-84a1-263fba7aade8	0442e5cd-e4b7-449d-ae56-8bac0028b958	Ibrahim Issa Kimaro	therealkimmy	oy	\N	2026-10-04 18:29:05.958811+00	e6d8ab26-f0d1-415d-84a1-263fba7aade8	2026-10-04 18:29:09.884537+00	\N	\N	\N
456	5ad57d77-26af-4eb9-bdc6-8c426fc2c3db	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_e6d8ab26-f0d1-415d-84a1-263fba7aade8	e6d8ab26-f0d1-415d-84a1-263fba7aade8	Sean wallace 	sean-wallace	Hy	\N	2026-10-04 18:29:33.822516+00	0442e5cd-e4b7-449d-ae56-8bac0028b958	2026-10-04 18:29:41.301754+00	\N	\N	\N
457	cd402630-2a39-448e-bc27-8276ad031aed	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_e6d8ab26-f0d1-415d-84a1-263fba7aade8	0442e5cd-e4b7-449d-ae56-8bac0028b958	Ibrahim Issa Kimaro	therealkimmy	adje	\N	2026-10-04 18:29:50.161591+00	e6d8ab26-f0d1-415d-84a1-263fba7aade8	2026-10-04 18:29:58.802404+00	\N	\N	\N
458	88a5da60-b4f9-4d95-b089-cc80ba9ab291	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_e6d8ab26-f0d1-415d-84a1-263fba7aade8	e6d8ab26-f0d1-415d-84a1-263fba7aade8	Sean wallace 	sean-wallace	Vipi	\N	2026-10-04 18:30:52.226551+00	0442e5cd-e4b7-449d-ae56-8bac0028b958	2026-10-04 18:31:02.219487+00	\N	\N	\N
459	0a7a9491-9f56-457e-8aa8-442bf09871fb	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_e6d8ab26-f0d1-415d-84a1-263fba7aade8	0442e5cd-e4b7-449d-ae56-8bac0028b958	Ibrahim Issa Kimaro	therealkimmy	safi	\N	2026-10-04 18:31:09.524144+00	e6d8ab26-f0d1-415d-84a1-263fba7aade8	2026-10-04 18:31:19.030331+00	\N	\N	\N
460	32c6a8a6-bfb5-4c4d-bde3-b25ac67b6166	direct:0442e5cd-e4b7-449d-ae56-8bac0028b958_e6d8ab26-f0d1-415d-84a1-263fba7aade8	0442e5cd-e4b7-449d-ae56-8bac0028b958	Ibrahim Issa Kimaro	therealkimmy	furesh	\N	2026-10-04 18:31:30.112723+00	e6d8ab26-f0d1-415d-84a1-263fba7aade8	2026-10-04 18:31:36.62031+00	\N	\N	\N
\.


--
-- Data for Name: comments; Type: TABLE DATA; Schema: public; Owner: ibrahim_kimaro
--

COPY public.comments (id, user_id, target_kind, target_id, body, created_at) FROM stdin;
\.


--
-- Data for Name: cv_requests; Type: TABLE DATA; Schema: public; Owner: ibrahim_kimaro
--

COPY public.cv_requests (id, owner_id, requester_id, name, email, message, status, ip, created_at, decided_at) FROM stdin;
\.


--
-- Data for Name: cvs; Type: TABLE DATA; Schema: public; Owner: ibrahim_kimaro
--

COPY public.cvs (user_id, data, signature, signed_at, share_token, updated_at) FROM stdin;
104fa91b-9a67-40fc-8a4c-453e9b380ef8	{"jobs": [], "name": "", "about": "", "links": [], "title": "", "skills": [], "address": "Dar es salaam, Tanzania", "hobbies": [], "referees": [], "education": [{"id": "da9c0de4-99d", "end": "2027", "place": "dar es salaam", "start": "2024", "title": "bachelor of cyber security", "points": ["good ", "exelen"], "organization": "Institute of finanace manegement"}], "languages": [{"name": "kisawahili", "level": 5}, {"name": "english", "level": 3}, {"name": "chinese", "level": 2}], "show_email": true, "show_phone": true, "role_points": {}, "hidden_roles": [], "hidden_skills": []}	data:image/png;base64,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	2026-10-03 15:55:33.736632+00	XdO985x7UYnvTpJ53d2rMT5hS1DXsdaL	2026-10-03 15:58:03.999293+00
e6d8ab26-f0d1-415d-84a1-263fba7aade8	{}	data:image/png;base64,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	2026-10-04 18:53:04.746196+00	\N	2026-10-04 18:53:04.727156+00
0442e5cd-e4b7-449d-ae56-8bac0028b958	{"jobs": [], "name": "", "about": "", "links": [], "title": "", "skills": [], "address": "", "hobbies": [], "referees": [], "education": [], "languages": [{"name": "chinese", "level": 4}], "show_email": true, "show_phone": true, "role_points": {}, "hidden_roles": [], "hidden_skills": []}	data:image/png;base64,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	2026-10-03 15:50:13.58207+00	mU9y5epFwqHkCOk_pR5FMwym_7E2Z1C-	2026-10-04 18:56:44.945473+00
\.


--
-- Data for Name: follows; Type: TABLE DATA; Schema: public; Owner: ibrahim_kimaro
--

COPY public.follows (id, follower_id, user_id, business_id, created_at) FROM stdin;
\.


--
-- Data for Name: guests; Type: TABLE DATA; Schema: public; Owner: ibrahim_kimaro
--

COPY public.guests (id, session_id, user_id, ip_address, user_agent, created_at, last_seen_at, name, email, visits) FROM stdin;
80a9b609-f05a-47ca-88b1-327042e53aff	guest-1791018051227-2rloymbj	7badeb71-35ad-4d23-8cf2-3f7a0f90bd0c	172.18.0.6	Mozilla/5.0 (iPhone; CPU iPhone OS 27_0_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/154.0.8037.55 Mobile/15E148 Safari/604.1	2026-10-04 13:45:11.238609+00	2026-10-04 14:39:07.16709+00	Sukka	\N	2
338d10fa-bb97-4a41-802b-f7992c351048	82471b6a-b90e-4d93-b506-9127a925bc55	08eb4d91-9de2-4856-9adc-0b59f1d8074e	172.18.0.6	Mozilla/5.0 (iPhone; CPU iPhone OS 27_0_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/154.0.8037.55 Mobile/15E148 Safari/604.1	2026-10-04 14:40:46.877985+00	2026-10-04 14:48:30.837077+00	Kimmy	\N	1
\.


--
-- Data for Name: likes; Type: TABLE DATA; Schema: public; Owner: ibrahim_kimaro
--

COPY public.likes (id, user_id, target_kind, target_id, created_at) FROM stdin;
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: ibrahim_kimaro
--

COPY public.notifications (id, user_id, kind, title, body, link, read_at, created_at, broadcast_id, delivered_at) FROM stdin;
9142fef4-c502-4eb4-9673-ca266cd41657	104fa91b-9a67-40fc-8a4c-453e9b380ef8	activated	Your account is active	You can now publish your work and make your profile public.	/profile	2026-10-03 06:50:39.7733+00	2026-10-03 06:50:33.89162+00	\N	\N
0c689aae-bf1c-4828-861d-630188c5ebaa	104fa91b-9a67-40fc-8a4c-453e9b380ef8	signin	New sign-in from Browser	Signed in from IP 127.0.0.1. If this wasn't you, sign out everywhere and change your password.	/settings#security	2026-10-03 07:20:12.471223+00	2026-10-03 07:11:38.727861+00	\N	\N
6dae6ba5-6d35-4ef7-83ac-7dbf1b770e9e	b816fcfb-f11a-4027-b728-a687322fe844	message	tamimu hamisi sent you a message	hello sir.	/chat?c=direct%3A104fa91b-9a67-40fc-8a4c-453e9b380ef8_b816fcfb-f11a-4027-b728-a687322fe844	2026-10-03 07:27:17.211483+00	2026-10-03 07:27:03.220147+00	\N	\N
bb5f197e-73bf-4422-adc3-30cf4592816d	e6d8ab26-f0d1-415d-84a1-263fba7aade8	activated	Your account is active	You can now publish your work and make your profile public.	/profile	2026-10-04 15:00:31.819454+00	2026-10-04 14:57:34.829884+00	\N	2026-10-04 14:57:36.783395+00
11823b64-5ad4-4b65-bdc3-b3645f63e47a	104fa91b-9a67-40fc-8a4c-453e9b380ef8	message	Home Proofolio sent you a message	yes welcome	/chat?c=direct%3A104fa91b-9a67-40fc-8a4c-453e9b380ef8_b816fcfb-f11a-4027-b728-a687322fe844	2026-10-03 07:27:24.701815+00	2026-10-03 07:27:24.69336+00	\N	\N
47ba45b3-9193-43bc-aa11-0f42bb23b98c	b816fcfb-f11a-4027-b728-a687322fe844	message	Guest #0D9E6C sent you a message	hi	/chat?c=direct%3A6ec2fca8-89f5-4180-bd0e-ef42262b7eb5_b816fcfb-f11a-4027-b728-a687322fe844	2026-10-03 08:50:39.809745+00	2026-10-03 08:50:23.169132+00	\N	\N
de4cc9e1-ec92-4c2b-9749-d7e89d06a845	b816fcfb-f11a-4027-b728-a687322fe844	message	Guest #0D9E6C sent you a message	sawa jinsi gani naweza kujisajili	/chat?c=direct%3A6ec2fca8-89f5-4180-bd0e-ef42262b7eb5_b816fcfb-f11a-4027-b728-a687322fe844	2026-10-03 08:53:05.431498+00	2026-10-03 08:52:19.537306+00	\N	\N
a326430d-32f1-49f7-a2f4-7f67d71cfb7e	b816fcfb-f11a-4027-b728-a687322fe844	message	Guest #0D9E6C sent you a message	sawa ahsante	/chat?c=direct%3A6ec2fca8-89f5-4180-bd0e-ef42262b7eb5_b816fcfb-f11a-4027-b728-a687322fe844	2026-10-03 08:53:47.819966+00	2026-10-03 08:53:47.806389+00	\N	\N
b4f81162-ab88-45e9-a625-5dd1ca3fb3b4	b816fcfb-f11a-4027-b728-a687322fe844	signin	New sign-in from Browser	Signed in from IP 127.0.0.1. If this wasn't you, sign out everywhere and change your password.	/settings#security	\N	2026-10-03 06:21:35.981907+00	\N	2026-10-04 16:12:04.563085+00
ac0a1046-684a-4543-a40f-9627eea50b83	b816fcfb-f11a-4027-b728-a687322fe844	message	Guest #0D9E6C sent you a message	How can I chat with support?	/chat?c=direct%3A6ec2fca8-89f5-4180-bd0e-ef42262b7eb5_b816fcfb-f11a-4027-b728-a687322fe844	2026-10-03 08:57:56.31285+00	2026-10-03 08:57:35.917077+00	\N	\N
daf5d2a3-f11d-4f89-8121-f2992a397e75	0442e5cd-e4b7-449d-ae56-8bac0028b958	call	Missed voice call from Tamimu Hamisi	\N	/chat?c=direct%3A0442e5cd-e4b7-449d-ae56-8bac0028b958_104fa91b-9a67-40fc-8a4c-453e9b380ef8	2026-10-03 20:03:37.473298+00	2026-10-03 20:01:28.404088+00	\N	\N
396b0a8f-e7c1-42a3-bcf1-ea72fd5f2ec1	0442e5cd-e4b7-449d-ae56-8bac0028b958	call	Missed voice call from Tamimu Hamisi	\N	/chat?c=direct%3A0442e5cd-e4b7-449d-ae56-8bac0028b958_104fa91b-9a67-40fc-8a4c-453e9b380ef8	2026-10-03 20:03:40.632878+00	2026-10-03 19:59:43.366627+00	\N	\N
47020816-3b90-4a79-b45a-61d7869f8c52	0442e5cd-e4b7-449d-ae56-8bac0028b958	signin	New sign-in from Chrome on Windows	Signed in from IP 172.18.0.6. If this wasn't you, sign out everywhere and change your password.	/settings#security	2026-10-03 20:07:43.715941+00	2026-10-03 20:07:05.294977+00	\N	\N
920bf414-8e93-4a30-b7fb-403fc93d0ad0	7dd010d7-164d-4879-ba77-da00faf76756	call	Missed video call from Ibrahim Issa Kimaro	\N	/chat?c=direct%3A0442e5cd-e4b7-449d-ae56-8bac0028b958_7dd010d7-164d-4879-ba77-da00faf76756	\N	2026-10-04 16:18:24.650137+00	\N	2026-10-04 16:18:38.191645+00
53aa4515-c531-41e6-b4cf-3bca7fbec704	7dd010d7-164d-4879-ba77-da00faf76756	message	Ibrahim Issa Kimaro sent you a message	subiri nilikua nagonga kwa tetsing sija build haha	/chat?c=direct%3A0442e5cd-e4b7-449d-ae56-8bac0028b958_7dd010d7-164d-4879-ba77-da00faf76756	\N	2026-10-04 16:21:25.967412+00	\N	\N
e776fff5-1288-4b1b-b098-cf42e14f9324	7dd010d7-164d-4879-ba77-da00faf76756	call	Missed voice call from Ibrahim Issa Kimaro	\N	/chat?c=direct%3A0442e5cd-e4b7-449d-ae56-8bac0028b958_7dd010d7-164d-4879-ba77-da00faf76756	\N	2026-10-04 16:21:59.636814+00	\N	\N
0644b072-198c-406e-9786-989496df2eb5	7dd010d7-164d-4879-ba77-da00faf76756	call	Missed voice call from Ibrahim Issa Kimaro	\N	/chat?c=direct%3A0442e5cd-e4b7-449d-ae56-8bac0028b958_7dd010d7-164d-4879-ba77-da00faf76756	\N	2026-10-04 16:22:05.031942+00	\N	\N
9b71457d-a4b9-4436-bdd1-d768763f443d	7dd010d7-164d-4879-ba77-da00faf76756	call	Missed voice call from Ibrahim Issa Kimaro	\N	/chat?c=direct%3A0442e5cd-e4b7-449d-ae56-8bac0028b958_7dd010d7-164d-4879-ba77-da00faf76756	\N	2026-10-04 16:22:13.123064+00	\N	\N
875c93cd-c691-4558-8005-bcdd602027cf	7dd010d7-164d-4879-ba77-da00faf76756	call	Missed voice call from Ibrahim Issa Kimaro	\N	/chat?c=direct%3A0442e5cd-e4b7-449d-ae56-8bac0028b958_7dd010d7-164d-4879-ba77-da00faf76756	\N	2026-10-04 16:22:32.372975+00	\N	\N
c8833e88-ecb2-4739-aa3f-832cb13d0611	08ecf6ff-fc6b-4453-a969-e2017e76af3b	message	Ibrahim Issa Kimaro sent you a message	oy saidi	/chat?c=direct%3A0442e5cd-e4b7-449d-ae56-8bac0028b958_08ecf6ff-fc6b-4453-a969-e2017e76af3b	\N	2026-10-04 16:23:52.499228+00	\N	\N
2f8529a3-ecc1-4aab-9eba-bd24d51624ce	7dd010d7-164d-4879-ba77-da00faf76756	code	Your activation code was emailed to you	Check your inbox (i•••@gmail.com). Never share it with anyone: we will never ask for it.	\N	\N	2026-10-04 16:34:36.047501+00	\N	\N
bc5e01c5-f7a2-47d7-9446-b22629624b1c	104fa91b-9a67-40fc-8a4c-453e9b380ef8	call	Missed voice call from Ibrahim Issa Kimaro	\N	/chat?c=direct%3A0442e5cd-e4b7-449d-ae56-8bac0028b958_104fa91b-9a67-40fc-8a4c-453e9b380ef8	2026-10-04 17:21:11.368108+00	2026-10-04 16:33:10.689144+00	\N	2026-10-04 16:33:18.9835+00
d1f293ef-736a-4ce5-9046-8e49a17dd609	0442e5cd-e4b7-449d-ae56-8bac0028b958	signin	New sign-in from Chrome on Windows	Signed in from IP 172.18.0.4. If this wasn't you, sign out everywhere and change your password.	/settings#security	2026-10-04 14:44:28.717639+00	2026-10-04 11:02:48.062369+00	\N	2026-10-04 11:45:20.64464+00
ea5532ce-59cc-4653-9f78-14028046f1a6	e6d8ab26-f0d1-415d-84a1-263fba7aade8	call	Missed voice call from Ibrahim Issa Kimaro	\N	/chat?c=direct%3A0442e5cd-e4b7-449d-ae56-8bac0028b958_e6d8ab26-f0d1-415d-84a1-263fba7aade8	2026-10-04 18:18:05.653383+00	2026-10-04 18:17:46.788313+00	\N	2026-10-04 18:17:55.364015+00
fc2c687e-8d09-4638-8852-056b6b879c7f	b816fcfb-f11a-4027-b728-a687322fe844	group	You joined "Testing group"	Real update group chata	/chat?g=1112a835-87f1-402a-9a46-7b786079bb8f	2026-10-03 16:53:45.149213+00	2026-10-03 16:53:35.194687+00	\N	\N
0982d2a0-c9d3-406c-ac33-9ced9785a528	0442e5cd-e4b7-449d-ae56-8bac0028b958	group	Home Proofolio joined "Testing group"	\N	/chat?c=room:testing-group-af6fc4	2026-10-03 16:56:59.070854+00	2026-10-03 16:53:45.139152+00	\N	\N
96615a8b-69ac-4dfa-b630-4426715606b3	104fa91b-9a67-40fc-8a4c-453e9b380ef8	signin	New sign-in from Chrome on Windows	Signed in from IP 172.18.0.6. If this wasn't you, sign out everywhere and change your password.	/settings#security	2026-10-03 19:58:51.368714+00	2026-10-03 19:58:35.616042+00	\N	\N
a6044717-2d11-4c0a-a15b-c0e7d0e8f1bc	b816fcfb-f11a-4027-b728-a687322fe844	signin	New sign-in from Chrome on Windows	Signed in from IP 172.18.0.4. If this wasn't you, sign out everywhere and change your password.	/settings#security	\N	2026-10-04 09:07:17.646905+00	\N	2026-10-04 16:12:04.563085+00
f2d76987-52e5-45f2-ab18-ec8f820f6282	b816fcfb-f11a-4027-b728-a687322fe844	signin	New sign-in from Safari on iPhone	Signed in from IP 172.18.0.4. If this wasn't you, sign out everywhere and change your password.	/settings#security	\N	2026-10-04 09:22:03.49084+00	\N	2026-10-04 16:12:04.563085+00
e8682698-a4ae-4362-af22-b1cb5a3a66b0	b816fcfb-f11a-4027-b728-a687322fe844	signin	New sign-in from Chrome on Windows	Signed in from IP 172.18.0.4. If this wasn't you, sign out everywhere and change your password.	/settings#security	\N	2026-10-04 11:05:26.831255+00	\N	2026-10-04 16:12:04.563085+00
9f4515d3-4713-4a9f-bbf7-ca819cc6fba5	0442e5cd-e4b7-449d-ae56-8bac0028b958	call	Missed voice call from Tamimu Hamisi	\N	/chat?c=direct%3A0442e5cd-e4b7-449d-ae56-8bac0028b958_104fa91b-9a67-40fc-8a4c-453e9b380ef8	2026-10-03 20:03:46.99082+00	2026-10-03 16:58:32.748032+00	\N	\N
e7ddc6f7-fb5f-40ec-a41f-c22c67a0f0c9	0442e5cd-e4b7-449d-ae56-8bac0028b958	signin	New sign-in from Chrome on Windows	Signed in from IP 172.18.0.2. If this wasn't you, sign out everywhere and change your password.	/settings#security	2026-10-03 20:03:51.175431+00	2026-10-03 16:35:12.684134+00	\N	\N
475496c0-148b-4de6-ae17-ddfa9c4ce1b0	b816fcfb-f11a-4027-b728-a687322fe844	group	History Tester joined "Chat Test Group"	\N	/chat?c=room:chat-test-group-5d4779	\N	2026-10-04 17:33:30.493586+00	\N	2026-10-04 17:35:57.631171+00
d31c2e5a-8501-48a7-bb56-3f264758af7d	0442e5cd-e4b7-449d-ae56-8bac0028b958	call	Missed voice call from Isack corleone 	\N	/chat?c=direct%3A0442e5cd-e4b7-449d-ae56-8bac0028b958_7dd010d7-164d-4879-ba77-da00faf76756	2026-10-04 16:14:33.220212+00	2026-10-04 16:14:10.562883+00	\N	2026-10-04 16:14:28.966684+00
a7f22410-4439-45f0-baa2-15ad31634183	7dd010d7-164d-4879-ba77-da00faf76756	call	Missed voice call from Ibrahim Issa Kimaro	\N	/chat?c=direct%3A0442e5cd-e4b7-449d-ae56-8bac0028b958_7dd010d7-164d-4879-ba77-da00faf76756	\N	2026-10-04 16:22:24.199227+00	\N	\N
964dea4f-ed12-4eb9-94ac-a841f4143008	0442e5cd-e4b7-449d-ae56-8bac0028b958	call	Missed voice call from Dr. Tamimu Hamisi	\N	/chat?c=direct%3A0442e5cd-e4b7-449d-ae56-8bac0028b958_104fa91b-9a67-40fc-8a4c-453e9b380ef8	2026-10-03 12:17:37.540985+00	2026-10-03 12:16:19.858222+00	\N	\N
1721a218-c9b4-44c3-853f-06ee9777020e	0442e5cd-e4b7-449d-ae56-8bac0028b958	call	Missed voice call from Sean wallace 	\N	/chat?c=direct%3A0442e5cd-e4b7-449d-ae56-8bac0028b958_e6d8ab26-f0d1-415d-84a1-263fba7aade8	2026-10-04 18:45:26.159398+00	2026-10-04 18:29:24.230824+00	\N	2026-10-04 18:29:30.921839+00
c0075600-faec-424f-b89b-55f018c9192d	0442e5cd-e4b7-449d-ae56-8bac0028b958	code	Your activation code was emailed to you	Check your inbox (i•••@gmail.com). Never share it with anyone: we will never ask for it.	\N	2026-10-04 16:30:07.57211+00	2026-10-04 16:29:55.333523+00	\N	2026-10-04 16:29:59.869676+00
fe41f0f9-c264-462c-97d1-a659437f55c3	b816fcfb-f11a-4027-b728-a687322fe844	message	Ibrahim Issa Kimaro sent you a message	yes	/chat?c=direct%3A0442e5cd-e4b7-449d-ae56-8bac0028b958_b816fcfb-f11a-4027-b728-a687322fe844	\N	2026-10-04 18:27:54.64746+00	\N	2026-10-04 18:52:06.897418+00
e93de51a-efc2-4d87-ad67-5e1013bc5964	104fa91b-9a67-40fc-8a4c-453e9b380ef8	group	You joined "Testing group"	Real update group chata	/chat?g=1112a835-87f1-402a-9a46-7b786079bb8f	2026-10-03 12:36:48.320692+00	2026-10-03 12:36:31.886559+00	\N	\N
94c65592-b895-4fa6-bd53-8a8525801bb6	b816fcfb-f11a-4027-b728-a687322fe844	group	You declined "Testing group"	Real update group chata	/chat?g=1112a835-87f1-402a-9a46-7b786079bb8f	2026-10-03 12:37:26.25475+00	2026-10-03 12:36:34.182915+00	\N	\N
8cbf2496-625a-4799-8b5b-77105c2f8d4d	b816fcfb-f11a-4027-b728-a687322fe844	group	You joined "Testing group"	Real update group chata	/chat?g=1112a835-87f1-402a-9a46-7b786079bb8f	2026-10-03 12:37:33.814958+00	2026-10-03 12:37:28.859792+00	\N	\N
7c7d5ab4-4892-430e-8d92-2c75270abab7	0442e5cd-e4b7-449d-ae56-8bac0028b958	group	Home Proofolio joined "Testing group"	\N	/chat?c=room:testing-group-af6fc4	2026-10-03 12:40:39.434203+00	2026-10-03 12:37:33.803224+00	\N	\N
38823f8e-e1ff-48f6-aa19-bba9dfb58010	0442e5cd-e4b7-449d-ae56-8bac0028b958	group	Dr. Tamimu Hamisi joined "Testing group"	\N	/chat?c=room:testing-group-af6fc4	2026-10-03 12:40:42.299913+00	2026-10-03 12:36:48.311721+00	\N	\N
c7b21a5e-b8b5-492f-85da-db12051e73f9	0442e5cd-e4b7-449d-ae56-8bac0028b958	group	Home Proofolio declined "Testing group"	\N	\N	2026-10-03 12:40:45.100829+00	2026-10-03 12:37:26.248446+00	\N	\N
4b9ad0bf-02ea-4acd-bfb7-ad97e219720c	0442e5cd-e4b7-449d-ae56-8bac0028b958	call	Missed voice call from Dr. Tamimu Hamisi	\N	/chat?c=direct%3A0442e5cd-e4b7-449d-ae56-8bac0028b958_104fa91b-9a67-40fc-8a4c-453e9b380ef8	2026-10-03 12:40:48.245903+00	2026-10-03 09:50:09.791772+00	\N	\N
\.


--
-- Data for Name: onboarding_answers; Type: TABLE DATA; Schema: public; Owner: ibrahim_kimaro
--

COPY public.onboarding_answers (id, user_id, question_key, answer, created_at) FROM stdin;
9434f9f2-a3c5-4823-bb8c-d5e335774d88	104fa91b-9a67-40fc-8a4c-453e9b380ef8	discipline	{"value": "accountant"}	2026-10-03 06:49:28.706241+00
885c141b-93f6-4abc-b745-a5d639c335b4	e6d8ab26-f0d1-415d-84a1-263fba7aade8	discipline	{"value": "ethical-hacking"}	2026-10-04 14:54:49.853915+00
0cd28f5d-c2c2-4d0a-b19c-a17eefe65e8a	7dd010d7-164d-4879-ba77-da00faf76756	discipline	{"value": "developer"}	2026-10-04 16:12:36.404272+00
d1fa6f05-3fd4-4e21-a0d3-e4ba972ab48e	08ecf6ff-fc6b-4453-a969-e2017e76af3b	discipline	{"value": "developer"}	2026-10-04 16:21:16.094687+00
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
ethical-hacking	Ethical hacking	tech	developer		penetration tester, social engeneering, malware attacker		320	t
\.


--
-- Data for Name: otp_logs; Type: TABLE DATA; Schema: public; Owner: ibrahim_kimaro
--

COPY public.otp_logs (id, user_id, destination, channel, code, purpose, is_verified, delivery_status, expires_at, created_at, verified_at, sent_via) FROM stdin;
\.


--
-- Data for Name: platform_settings; Type: TABLE DATA; Schema: public; Owner: ibrahim_kimaro
--

COPY public.platform_settings (key, value, updated_at) FROM stdin;
registration	{"open": true, "closed_message": ""}	2026-10-01 11:03:03.482964+00
onboarding	{"work": {"title": "Here's your first entry.", "enabled": true, "subtitle": "We filled it in from your discipline. Make it yours."}, "account": {"title": "Keep what you built", "enabled": true, "subtitle": "Create your account to save it.", "phone_enabled": true}, "evidence": {"title": "Where's the proof?", "enabled": true, "subtitle": "A link people can open. You can add files later."}, "questions": {"title": "A few quick questions", "enabled": true, "subtitle": "This helps us shape Home Proofolio for you."}, "appearance": {"title": "Personalize your appearance", "enabled": true, "subtitle": "You can change this anytime in Settings."}, "discipline": {"title": "What kind of work do you do?", "enabled": true, "subtitle": "Pick your primary discipline. You can add more roles later."}}	2026-10-01 11:03:59.684003+00
announcement	{"link": null, "text": "", "tone": "info", "active": false}	2026-10-04 15:02:25.545277+00
\.


--
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: ibrahim_kimaro
--

COPY public.profiles (id, user_id, username, display_name, bio, avatar_url, visibility, created_at, updated_at, headline, portfolio, allow_indexing) FROM stdin;
0dbf54bf-a8e8-47fc-9b36-384fb30590c7	b816fcfb-f11a-4027-b728-a687322fe844	home_proofolio	Home Proofolio	\N	\N	public	2026-09-30 11:51:23.871951+00	2026-09-30 11:51:23.871951+00	\N	{}	t
75281f86-e233-4fe4-9698-65650ea5d97c	104fa91b-9a67-40fc-8a4c-453e9b380ef8	aminak	Amina Kimaro	Licensed Medical Doctor and clinical informatician specializing in emergency care systems, evidence-based diagnostic protocols, and healthcare data standardization. Working at the intersection of clinical medicine and digital health technology to improve patient care outcomes.	\N	public	2026-10-03 06:49:28.411727+00	2026-10-03 20:54:37.650426+00	Medical Doctor & Clinical Informatics Specialist	{"tagline": "Advancing clinical excellence and healthcare data interoperability.", "sections": ["works", "articles", "about", "experience", "contact"], "show_metrics": true, "contact_email": "tamimu.hamisi@gmail.com"}	t
f65c54cb-89bf-4af9-8b94-b8b08044d175	7badeb71-35ad-4d23-8cf2-3f7a0f90bd0c	guest_guest-17	Sukka	\N	\N	private	2026-10-04 13:45:11.238609+00	2026-10-04 14:20:43.098327+00	\N	{}	t
1a349421-312d-45c2-89ea-4d2f0adc7e4f	08eb4d91-9de2-4856-9adc-0b59f1d8074e	guest_kimmy-5452	Kimmy	\N	\N	private	2026-10-04 14:40:46.877985+00	2026-10-04 14:40:46.877985+00	\N	{}	t
fc8f6219-8275-4351-996f-702921fc31e2	e6d8ab26-f0d1-415d-84a1-263fba7aade8	sean-wallace	Sean wallace 	\N	/files/eaa4b3c7a600463ab5e8849e3ed61004.jpg	private	2026-10-04 14:54:48.360723+00	2026-10-04 15:52:36.2834+00	\N	{}	t
da00ece8-52fa-4e56-a50d-4d14372ac2fe	7dd010d7-164d-4879-ba77-da00faf76756	isack-corleone	Isack corleone 	\N	\N	private	2026-10-04 16:12:35.404056+00	2026-10-04 16:12:35.404056+00	\N	{}	t
2f6706c6-ce8b-4b6c-8019-2f4525482cf1	08ecf6ff-fc6b-4453-a969-e2017e76af3b	saidi-mdee	Saidi Mdee	\N	\N	private	2026-10-04 16:21:15.311567+00	2026-10-04 16:21:15.311567+00	\N	{}	t
1b5384d8-50fd-47e4-a91d-65c6d506a256	0442e5cd-e4b7-449d-ae56-8bac0028b958	therealkimmy	Ibrahim Issa Kimaro	Specializing in distributed systems, network security protocols, and high-reliability data synchronization infrastructure. Focused on building verifiable, zero-trust architectures for real-world operations.	/files/13f5f61c104f40cb814f3ebf7e23c30c.jpg	public	2026-09-30 14:15:33.531282+00	2026-10-04 20:34:15.048175+00	Cybersecurity Engineer & Systems Architect	{"roles": [], "socials": [{"handle": "https://t.me/youngSungJinWoo", "platform": "telegram"}, {"handle": "https://github.com/ibrahimkimaro", "platform": "github"}, {"handle": "https://www.instagram.com/ibrahim__kimaro", "platform": "instagram"}, {"handle": "https://www.tiktok.com/@ibrahim__kimaro", "platform": "tiktok"}], "tagline": null, "contacts": [{"kind": "email", "label": "Sign-in email", "value": "ibrahimkimaro01@gmail.com"}, {"kind": "phone", "label": "personal", "value": "0628726374"}, {"kind": "phone", "label": "home", "value": "0716273846"}], "featured": ["29e325e2-8951-4032-8f79-f40a00f7e3d7", "27bf2b97-a8b6-4d5f-b783-856ed5364bbf", "276c6cdd-e021-4b4b-b94f-8c6c89fa7210", "b265e346-e69b-49af-9d13-b25dddbfa7b0"], "sections": ["about", "experience", "works", "contact"], "show_metrics": true, "contact_email": "ibrahimkimaro01@gmail.com"}	t
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: ibrahim_kimaro
--

COPY public.roles (id, user_id, business_id, organization_name, title, start_date, end_date, visibility, trust, hidden_by_business, created_at) FROM stdin;
16aaac27-5023-4e38-9396-ecce26201c1e	0442e5cd-e4b7-449d-ae56-8bac0028b958	\N	Distributed Systems Lab	Lead Systems Architect & Security Engineer	2024-01-15	\N	public	self_declared	f	2026-08-04 08:56:25.282873+00
606ed306-9bd9-48f0-9083-445b67902fe6	0442e5cd-e4b7-449d-ae56-8bac0028b958	\N	EdgeSec Networks	Infrastructure Security Specialist	2022-03-01	2023-12-31	public	self_declared	f	2026-06-05 08:56:25.282873+00
096d3588-0bed-4358-9712-7f359f4c1f22	0442e5cd-e4b7-449d-ae56-8bac0028b958	\N	Dar Telecommunications Operations	Systems & Network Engineer	2020-06-01	2022-02-28	public	self_declared	f	2026-04-06 08:56:25.282873+00
ef6d58c7-f66d-4827-a2cf-664b4fcb76de	0442e5cd-e4b7-449d-ae56-8bac0028b958	\N	Institute of Finance Management (IFM)	Information Systems Researcher	2018-09-01	2020-05-30	public	self_declared	f	2026-02-05 08:56:25.282873+00
c81dc806-cd26-4dbf-815f-81cc0d5a87ec	104fa91b-9a67-40fc-8a4c-453e9b380ef8	\N	Muhimbili National Hospital	Medical Doctor & Clinical Informatics Specialist	2023-01-15	\N	public	self_declared	f	2026-08-04 08:56:25.282873+00
3ce8b5b6-cbf1-4585-96ab-d8eea26ba9bf	104fa91b-9a67-40fc-8a4c-453e9b380ef8	\N	Regional Referral Hospital	Emergency Medicine Medical Officer & Triage Lead	2021-04-01	2022-12-31	public	self_declared	f	2026-06-05 08:56:25.282873+00
dbd736cb-f5bd-4d0d-849f-0158e0fb9719	104fa91b-9a67-40fc-8a4c-453e9b380ef8	\N	Coast Provincial Hospital	Clinical Resident (Acute & Internal Medicine)	2019-02-01	2021-03-31	public	self_declared	f	2026-04-06 08:56:25.282873+00
3e28293a-5868-40da-a4db-8a0e423047c2	104fa91b-9a67-40fc-8a4c-453e9b380ef8	\N	Tanzania Health Research Institute	Health Informatics Research Associate	2017-08-01	2019-01-15	public	self_declared	f	2026-02-05 08:56:25.282873+00
bd5d5acb-5eb7-4ea8-b9a1-27c39afcce3f	0442e5cd-e4b7-449d-ae56-8bac0028b958	\N	National Insurance Corporation (NIC)	Software Developer	\N	\N	public	self_declared	f	2026-10-04 19:38:29.951717+00
\.


--
-- Data for Name: security_events; Type: TABLE DATA; Schema: public; Owner: ibrahim_kimaro
--

COPY public.security_events (id, kind, ip, user_id, email, user_agent, details, created_at) FROM stdin;
991bf456-77c3-4efc-89dc-d39608d334a1	login_locked	172.18.0.4	\N	ibrahimkimaro01@gmail.com	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	{"wait_s": 15}	2026-10-03 05:58:52.043962+00
91418e5e-d298-4ed4-a559-e65cefda1f84	login_ok	172.18.0.4	b816fcfb-f11a-4027-b728-a687322fe844	admin@homeproofolio.co.tz	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	{}	2026-10-03 06:11:35.633783+00
e80c894f-888f-489e-a2fc-d3186b17ef9a	login_ok	127.0.0.1	b816fcfb-f11a-4027-b728-a687322fe844	admin@homeproofolio.co.tz	Python-urllib/3.12	{}	2026-10-03 06:21:35.981907+00
7b5eba58-1170-4038-80ef-7c6f0d789176	login_ok	127.0.0.1	b816fcfb-f11a-4027-b728-a687322fe844	admin@homeproofolio.co.tz	Python-urllib/3.12	{}	2026-10-03 06:21:46.923668+00
79768bef-07b8-4481-83e1-3044806c4471	signup	172.18.0.5	104fa91b-9a67-40fc-8a4c-453e9b380ef8	tamimu.hamisi@gmail.com	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	{}	2026-10-03 06:49:28.675901+00
25185f0a-9149-4066-ac8a-679bb948825a	login_failed	172.18.0.5	\N	tamim.hamisi@gmai.com	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	{"reason": "unknown_email"}	2026-10-03 06:54:21.678921+00
e566fcd5-c4b4-4161-aa60-33d57c470a8a	login_failed	172.18.0.5	\N	tamim.hamisi@gmail.com	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	{"reason": "unknown_email"}	2026-10-03 06:54:31.272916+00
54faa38a-c395-44cd-a981-04440054e775	login_ok	172.18.0.5	104fa91b-9a67-40fc-8a4c-453e9b380ef8	tamimu.hamisi@gmail.com	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	{}	2026-10-03 06:54:49.004054+00
d6cd0a07-937e-445a-8e0d-1eaebcffc2b2	login_ok	127.0.0.1	104fa91b-9a67-40fc-8a4c-453e9b380ef8	tamimu.hamisi@gmail.com	Python-urllib/3.12	{}	2026-10-03 07:11:38.727861+00
86389aa5-772d-42a1-abf1-5e23f7d07207	login_ok	127.0.0.1	b816fcfb-f11a-4027-b728-a687322fe844	admin@homeproofolio.co.tz	Python-urllib/3.12	{}	2026-10-03 07:11:48.527878+00
e5e1ddb0-7d0e-4a7b-92a5-68968feb08c1	login_ok	172.18.0.5	0442e5cd-e4b7-449d-ae56-8bac0028b958	ibrahimkimaro01@gmail.com	Mozilla/5.0 (iPhone; CPU iPhone OS 27_0_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/154.0.8037.55 Mobile/15E148 Safari/604.1	{}	2026-10-03 09:03:52.176622+00
d93a7329-024b-445e-8aee-eeae4ba22a93	login_ok	172.18.0.6	0442e5cd-e4b7-449d-ae56-8bac0028b958	ibrahimkimaro01@gmail.com	Mozilla/5.0 (iPhone; CPU iPhone OS 27_0_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/154.0.8037.55 Mobile/15E148 Safari/604.1	{}	2026-10-03 12:17:01.940753+00
ca6d7258-7c45-4dfe-b250-7494b51c98ae	login_ok	172.18.0.5	0442e5cd-e4b7-449d-ae56-8bac0028b958	ibrahimkimaro01@gmail.com	Mozilla/5.0 (iPhone; CPU iPhone OS 27_0_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/154.0.8037.55 Mobile/15E148 Safari/604.1	{}	2026-10-03 16:11:31.775777+00
e06dd7ee-afe8-4c59-b16f-aca0d9e2742d	login_ok	172.18.0.5	0442e5cd-e4b7-449d-ae56-8bac0028b958	ibrahimkimaro01@gmail.com	Mozilla/5.0 (iPhone; CPU iPhone OS 27_0_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/154.0.8037.55 Mobile/15E148 Safari/604.1	{}	2026-10-03 16:11:38.187916+00
eee40909-74c3-4de5-a79d-f7d7c44d7032	login_ok	172.18.0.2	0442e5cd-e4b7-449d-ae56-8bac0028b958	ibrahimkimaro01@gmail.com	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	{}	2026-10-03 16:35:12.684134+00
d42cf06f-5755-47c5-ad2e-d517b6db12e8	login_failed	172.18.0.2	104fa91b-9a67-40fc-8a4c-453e9b380ef8	tamimu.hamisi@gmail.com	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	{"reason": "wrong_password"}	2026-10-03 16:46:42.952416+00
87e5e33d-8bf0-4b1e-9269-e7e6b9c329e8	login_ok	172.18.0.2	104fa91b-9a67-40fc-8a4c-453e9b380ef8	tamimu.hamisi@gmail.com	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	{}	2026-10-03 16:46:49.311507+00
e25fc27c-4776-4722-a0e4-f2798bca5152	login_ok	172.18.0.6	0442e5cd-e4b7-449d-ae56-8bac0028b958	ibrahimkimaro01@gmail.com	Mozilla/5.0 (iPhone; CPU iPhone OS 27_0_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/154.0.8037.55 Mobile/15E148 Safari/604.1	{}	2026-10-03 19:57:45.882197+00
4ec42b05-12f1-44ec-bdb4-fa993abf7476	login_failed	172.18.0.6	104fa91b-9a67-40fc-8a4c-453e9b380ef8	tamimu.hamisi@gmail.com	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36	{"reason": "wrong_password"}	2026-10-03 19:58:26.62223+00
242881de-64f4-4f4f-8a3a-dfa510ed3748	login_ok	172.18.0.6	104fa91b-9a67-40fc-8a4c-453e9b380ef8	tamimu.hamisi@gmail.com	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36	{}	2026-10-03 19:58:35.616042+00
c4b04d57-1b4d-48a3-a1d9-19f7d6202b61	login_ok	172.18.0.6	0442e5cd-e4b7-449d-ae56-8bac0028b958	ibrahimkimaro01@gmail.com	Mozilla/5.0 (iPhone; CPU iPhone OS 27_0_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/154.0.8037.55 Mobile/15E148 Safari/604.1	{}	2026-10-03 20:00:41.9143+00
32e8488f-a167-40a6-9efc-eb5a2496c4bf	login_ok	172.18.0.6	0442e5cd-e4b7-449d-ae56-8bac0028b958	ibrahimkimaro01@gmail.com	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36	{}	2026-10-03 20:07:05.294977+00
b80dcacb-b486-4928-8705-36f209c662fb	login_ok	172.18.0.6	0442e5cd-e4b7-449d-ae56-8bac0028b958	ibrahimkimaro01@gmail.com	Mozilla/5.0 (iPhone; CPU iPhone OS 27_0_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/154.0.8037.55 Mobile/15E148 Safari/604.1	{}	2026-10-03 20:07:24.556189+00
f4e1520f-c61e-46dc-9f77-cf1431d9ce52	login_ok	172.18.0.6	0442e5cd-e4b7-449d-ae56-8bac0028b958	ibrahimkimaro01@gmail.com	Mozilla/5.0 (iPhone; CPU iPhone OS 27_0_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/154.0.8037.55 Mobile/15E148 Safari/604.1	{}	2026-10-03 20:07:25.461218+00
4b854c0e-8026-4486-8605-ec657bc4dfbe	login_ok	172.18.0.6	0442e5cd-e4b7-449d-ae56-8bac0028b958	ibrahimkimaro01@gmail.com	Mozilla/5.0 (iPhone; CPU iPhone OS 27_0_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/154.0.8037.55 Mobile/15E148 Safari/604.1	{}	2026-10-03 20:08:13.252007+00
51872069-4289-4c96-83e6-f66f633fd449	login_failed	172.18.0.6	0442e5cd-e4b7-449d-ae56-8bac0028b958	ibrahimkimaro01@gmail.com	Mozilla/5.0 (iPhone; CPU iPhone OS 27_0_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/154.0.8037.55 Mobile/15E148 Safari/604.1	{"reason": "wrong_password"}	2026-10-03 20:09:40.222461+00
7fcc8fe4-2b38-4550-982b-d9f9981b4c6a	login_ok	172.18.0.6	0442e5cd-e4b7-449d-ae56-8bac0028b958	ibrahimkimaro01@gmail.com	Mozilla/5.0 (iPhone; CPU iPhone OS 27_0_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/154.0.8037.55 Mobile/15E148 Safari/604.1	{}	2026-10-03 20:09:46.993709+00
e4f69f5b-b4e0-45c1-8a4c-7a32ae2c2cbb	login_ok	172.18.0.6	0442e5cd-e4b7-449d-ae56-8bac0028b958	ibrahimkimaro01@gmail.com	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36	{}	2026-10-03 20:12:50.164148+00
8dacd53e-0a95-41ab-be45-edd5142255af	login_ok	172.18.0.6	0442e5cd-e4b7-449d-ae56-8bac0028b958	ibrahimkimaro01@gmail.com	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36	{}	2026-10-03 20:13:21.536995+00
835fea82-c0d1-4fe4-8e4a-feb70bae5310	login_ok	172.18.0.6	0442e5cd-e4b7-449d-ae56-8bac0028b958	ibrahimkimaro01@gmail.com	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36	{}	2026-10-03 20:27:14.62798+00
cdbd69d2-3285-4004-a6ee-db72c3af7e83	login_ok	172.18.0.6	0442e5cd-e4b7-449d-ae56-8bac0028b958	ibrahimkimaro01@gmail.com	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36	{}	2026-10-03 20:27:21.970729+00
81b037de-e94a-42d5-a972-3e1d7d4d5f75	login_ok	172.18.0.6	0442e5cd-e4b7-449d-ae56-8bac0028b958	ibrahimkimaro01@gmail.com	Mozilla/5.0 (iPhone; CPU iPhone OS 27_0_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/154.0.8037.55 Mobile/15E148 Safari/604.1	{}	2026-10-03 20:28:03.907691+00
9effe9b8-06f3-45a1-b00c-bb7f0472f84e	login_ok	172.18.0.6	104fa91b-9a67-40fc-8a4c-453e9b380ef8	tamimu.hamisi@gmail.com	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36	{}	2026-10-03 20:52:12.873864+00
05d0c353-308a-43b0-a701-78865e3f6a6d	login_ok	172.18.0.4	b816fcfb-f11a-4027-b728-a687322fe844	admin@homeproofolio.co.tz	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36	{}	2026-10-04 09:07:17.646905+00
2f74bc96-c734-4b00-9633-6718c817a33f	login_ok	172.18.0.4	b816fcfb-f11a-4027-b728-a687322fe844	admin@homeproofolio.co.tz	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36	{}	2026-10-04 09:07:20.663221+00
d8dc68fa-e5ca-4f73-aa20-36657f9cd9c0	login_ok	172.18.0.4	104fa91b-9a67-40fc-8a4c-453e9b380ef8	amina.kimaro@gmail.com	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36	{}	2026-10-04 09:20:50.145033+00
fd31bec8-9d33-4503-9199-f1ca6e542380	login_ok	172.18.0.4	b816fcfb-f11a-4027-b728-a687322fe844	admin@homeproofolio.co.tz	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.0 Mobile/15E148 Safari/604.1	{}	2026-10-04 09:22:03.49084+00
8d02a7f1-5888-4494-8c7a-0328db144eee	login_ok	172.18.0.4	0442e5cd-e4b7-449d-ae56-8bac0028b958	ibrahimkimaro01@gmail.com	Mozilla/5.0 (iPhone; CPU iPhone OS 27_0_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/154.0.8037.55 Mobile/15E148 Safari/604.1	{}	2026-10-04 09:23:22.854725+00
c3ffbfe0-3391-43d9-8230-ddb6204e8c88	signup	172.18.0.1	\N	homeproofolio+codetest@gmail.com	curl/8.21.0	{}	2026-10-04 10:47:03.873013+00
523d8829-b43a-4159-8200-84c7bcb2c052	otp_failed	172.18.0.1	\N	homeproofolio+codetest@gmail.com	curl/8.21.0	{}	2026-10-04 10:47:51.652702+00
7164bfaf-bbff-442c-b6f8-7a107f7860b1	signup	172.18.0.1	\N	homeproofolio+codetest2@gmail.com	curl/8.21.0	{}	2026-10-04 10:53:21.664315+00
687647f1-f745-42fb-8239-bdf47a14f1e4	login_ok	172.18.0.4	0442e5cd-e4b7-449d-ae56-8bac0028b958	ibrahimkimaro01@gmail.com	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Claude/2.19675.0 Chrome/152.0.7977.130 Safari/537.36 MSIX	{}	2026-10-04 11:02:48.062369+00
936ffe5f-1500-48fd-83da-ab3b4e1d665d	login_ok	172.18.0.4	b816fcfb-f11a-4027-b728-a687322fe844	admin@homeproofolio.co.tz	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36	{}	2026-10-04 11:04:58.268773+00
1428b4e4-b53d-4f01-9a72-084963e707b9	login_failed	172.18.0.4	b816fcfb-f11a-4027-b728-a687322fe844	admin@homeproofolio.co.tz	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Claude/2.19675.0 Chrome/152.0.7977.130 Safari/537.36 MSIX	{"reason": "wrong_password"}	2026-10-04 11:05:04.852646+00
45872f0e-e267-4afe-8844-11751ecdff2b	login_ok	172.18.0.4	b816fcfb-f11a-4027-b728-a687322fe844	admin@homeproofolio.co.tz	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Claude/2.19675.0 Chrome/152.0.7977.130 Safari/537.36 MSIX	{}	2026-10-04 11:05:26.831255+00
a6cd1aca-895a-410a-a074-9e160ce40aa0	login_ok	172.18.0.8	0442e5cd-e4b7-449d-ae56-8bac0028b958	ibrahimkimaro01@gmail.com	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36	{}	2026-10-04 13:18:52.732135+00
384348bd-8300-4d1a-8245-db5e42c64762	signup	172.18.0.6	e6d8ab26-f0d1-415d-84a1-263fba7aade8	ibrahimkimaro00@gmail.com	Mozilla/5.0 (iPhone; CPU iPhone OS 27_0_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/154.0.8037.55 Mobile/15E148 Safari/604.1	{}	2026-10-04 14:54:48.60699+00
8eb2eb88-91c9-4055-9f80-31535d34e5eb	otp_failed	172.18.0.6	e6d8ab26-f0d1-415d-84a1-263fba7aade8	ibrahimkimaro00@gmail.com	Mozilla/5.0 (iPhone; CPU iPhone OS 27_0_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/154.0.8037.55 Mobile/15E148 Safari/604.1	{}	2026-10-04 14:55:56.754549+00
1c00059e-792b-4b1d-9d33-aa9b8bf19598	otp_failed	172.18.0.6	e6d8ab26-f0d1-415d-84a1-263fba7aade8	ibrahimkimaro00@gmail.com	Mozilla/5.0 (iPhone; CPU iPhone OS 27_0_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/154.0.8037.55 Mobile/15E148 Safari/604.1	{}	2026-10-04 14:56:10.840036+00
b0d313fd-5a4c-4409-9d49-f159534e60c2	otp_failed	172.18.0.6	e6d8ab26-f0d1-415d-84a1-263fba7aade8	ibrahimkimaro00@gmail.com	Mozilla/5.0 (iPhone; CPU iPhone OS 27_0_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/154.0.8037.55 Mobile/15E148 Safari/604.1	{}	2026-10-04 14:56:47.931724+00
09e47450-c46f-4f28-8d3b-7aeeefcc9759	otp_failed	172.18.0.6	e6d8ab26-f0d1-415d-84a1-263fba7aade8	ibrahimkimaro00@gmail.com	Mozilla/5.0 (iPhone; CPU iPhone OS 27_0_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/154.0.8037.55 Mobile/15E148 Safari/604.1	{}	2026-10-04 14:57:28.231534+00
d2ca8636-8c3f-40ff-b638-d65c8249bc9d	login_ok	172.18.0.4	0442e5cd-e4b7-449d-ae56-8bac0028b958	ibrahimkimaro01@gmail.com	Mozilla/5.0 (iPhone; CPU iPhone OS 27_0_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/154.0.8037.55 Mobile/15E148 Safari/604.1	{}	2026-10-04 15:01:16.890218+00
df607ce5-a6c7-45a0-b805-f075ef187e22	login_ok	172.18.0.4	0442e5cd-e4b7-449d-ae56-8bac0028b958	ibrahimkimaro01@gmail.com	Mozilla/5.0 (iPhone; CPU iPhone OS 27_0_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/154.0.8037.55 Mobile/15E148 Safari/604.1	{}	2026-10-04 15:14:50.291244+00
218313fb-778a-4f34-b90a-52dc49a67e35	login_ok	172.18.0.6	e6d8ab26-f0d1-415d-84a1-263fba7aade8	ibrahimkimaro00@gmail.com	Mozilla/5.0 (iPhone; CPU iPhone OS 27_0_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/154.0.8037.55 Mobile/15E148 Safari/604.1	{}	2026-10-04 16:11:20.396594+00
0d825262-5d2a-4b89-90d3-ab037fece96b	signup	172.18.0.6	7dd010d7-164d-4879-ba77-da00faf76756	isackhaule1903@gmail.com	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/30.1 Chrome/143.0.0.0 Mobile Safari/537.36	{}	2026-10-04 16:12:35.638723+00
0f6d664c-67a5-47d2-8a49-7002b1cf5679	otp_failed	172.18.0.4	b816fcfb-f11a-4027-b728-a687322fe844	admin@homeproofolio.co.tz	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Claude/2.19675.0 Chrome/152.0.7977.130 Safari/537.36 MSIX	{}	2026-10-04 16:13:50.277847+00
d682addf-b00f-4880-8563-52c62b64f667	otp_failed	172.18.0.1	\N	codetest-member@grouptest.proofolio.dev	curl/8.21.0	{}	2026-10-04 16:07:43.385027+00
b9c0a4dc-648d-4fb2-89c7-b06e685a3334	otp_failed	172.18.0.1	\N	codetest-member@grouptest.proofolio.dev	curl/8.21.0	{}	2026-10-04 16:07:45.97605+00
bf2399c7-bcb5-480c-b4e1-58d2d89272c8	otp_failed	172.18.0.1	\N	codetest-member@grouptest.proofolio.dev	curl/8.21.0	{}	2026-10-04 16:07:46.05368+00
8eb1903e-b8d5-4083-9356-5d7b6f691938	otp_failed	172.18.0.1	\N	codetest-member@grouptest.proofolio.dev	curl/8.21.0	{}	2026-10-04 16:07:46.147079+00
72cd03a7-5590-47c6-b36f-af0c640386cf	otp_failed	172.18.0.1	\N	codetest-member@grouptest.proofolio.dev	curl/8.21.0	{}	2026-10-04 16:07:46.223262+00
5e969da8-3c24-4794-abaa-2778d97fef08	otp_failed	172.18.0.1	\N	codetest-member@grouptest.proofolio.dev	curl/8.21.0	{}	2026-10-04 16:07:46.314719+00
09ead97a-3588-4e1c-8b80-97c1e4352f01	otp_cancelled	172.18.0.1	\N	codetest-member@grouptest.proofolio.dev	curl/8.21.0	{}	2026-10-04 16:07:46.314719+00
4e3e5542-c995-476f-9c96-103f5ec2f191	login_ok	172.18.0.6	0442e5cd-e4b7-449d-ae56-8bac0028b958	ibrahimkimaro01@gmail.com	Mozilla/5.0 (iPhone; CPU iPhone OS 27_0_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/154.0.8037.55 Mobile/15E148 Safari/604.1	{}	2026-10-04 16:19:44.284618+00
28e7163e-d7b7-4027-8da5-0c130dcca923	signup	172.18.0.6	08ecf6ff-fc6b-4453-a969-e2017e76af3b	mdees9021@gmail.com	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Mobile Safari/537.36	{}	2026-10-04 16:21:15.550141+00
80b15345-1006-4d8f-bda3-0e207dc5fdb6	login_failed	172.18.0.6	e6d8ab26-f0d1-415d-84a1-263fba7aade8	ibrahimkimaro00@gmail.com	Mozilla/5.0 (iPhone; CPU iPhone OS 27_0_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/154.0.8037.55 Mobile/15E148 Safari/604.1	{"reason": "wrong_password"}	2026-10-04 17:21:59.864115+00
21446480-fe43-4c67-b45a-46baaa52306e	login_ok	172.18.0.6	e6d8ab26-f0d1-415d-84a1-263fba7aade8	ibrahimkimaro00@gmail.com	Mozilla/5.0 (iPhone; CPU iPhone OS 27_0_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/154.0.8037.55 Mobile/15E148 Safari/604.1	{}	2026-10-04 17:22:05.135321+00
8dfabdde-de19-4e70-93d6-220fee6be02e	login_ok	172.18.0.4	0442e5cd-e4b7-449d-ae56-8bac0028b958	ibrahimkimaro01@gmail.com	Mozilla/5.0 (iPhone; CPU iPhone OS 27_0_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/154.0.8037.55 Mobile/15E148 Safari/604.1	{}	2026-10-04 17:24:55.891744+00
ee837d8d-f285-4414-8e65-fca407b2f38a	signup	172.18.0.4	\N	qa.layout.phone@proofolio-test.dev	Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.6584	{}	2026-10-04 17:19:32.893557+00
4b6c7e51-98c8-4189-b32f-3b19afbd0114	login_ok	172.18.0.4	\N	qa.layout.phone@proofolio-test.dev	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/154.0.0.0 Safari/537.36	{}	2026-10-04 17:20:02.519677+00
dad37d74-c092-4bf3-93dc-0fd7dd364f81	login_ok	172.18.0.4	\N	qa.layout.phone@proofolio-test.dev	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/154.0.0.0 Safari/537.36	{}	2026-10-04 17:20:55.446797+00
6ed14d45-8176-4ce0-8a6d-7692d4a8e40f	login_ok	172.18.0.4	\N	qa.layout.phone@proofolio-test.dev	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/154.0.0.0 Safari/537.36	{}	2026-10-04 17:21:33.040623+00
2d865005-fcee-4214-99d2-7e31995820ce	login_ok	172.18.0.4	\N	qa.layout.phone@proofolio-test.dev	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/154.0.0.0 Safari/537.36	{}	2026-10-04 17:22:07.377034+00
4751b6fb-c43d-4bbb-868a-8bb3c7eeda7e	login_ok	172.18.0.4	\N	qa.layout.phone@proofolio-test.dev	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/154.0.0.0 Safari/537.36	{}	2026-10-04 17:22:26.207141+00
5205bfaa-f1c9-4f70-a69b-8a45870b4fbe	login_ok	172.18.0.4	\N	qa.layout.phone@proofolio-test.dev	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/154.0.0.0 Safari/537.36	{}	2026-10-04 17:23:09.152996+00
0a434c6c-1785-4cb7-bc4a-05ceee2ef893	login_ok	172.18.0.4	\N	qa.layout.phone@proofolio-test.dev	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/154.0.0.0 Safari/537.36	{}	2026-10-04 17:23:30.54436+00
13086a82-5374-4f37-9d1b-2ab5546b3acb	login_ok	172.18.0.4	\N	qa.layout.phone@proofolio-test.dev	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/154.0.0.0 Safari/537.36	{}	2026-10-04 17:24:00.4149+00
d1b7cbc6-e306-4f69-9339-6908cf3a9431	login_ok	172.18.0.4	\N	qa.layout.phone@proofolio-test.dev	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/154.0.0.0 Safari/537.36	{}	2026-10-04 17:24:24.047107+00
a54a803b-4a8f-4027-a2b6-4744a58e8089	login_ok	172.18.0.4	\N	qa.layout.phone@proofolio-test.dev	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/154.0.0.0 Safari/537.36	{}	2026-10-04 17:24:48.39549+00
557123b4-ac1c-48c2-bfa8-fa5f43d38b79	login_ok	172.18.0.4	\N	qa.layout.phone@proofolio-test.dev	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/154.0.0.0 Safari/537.36	{}	2026-10-04 17:25:26.646352+00
2f365dc8-0cec-4da6-8b54-8a725ac96920	login_ok	172.18.0.1	\N	qa.layout.phone@proofolio-test.dev	Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.6584	{}	2026-10-04 17:30:12.981764+00
8ad59299-a07c-436a-a644-26b9f1061bea	login_ok	172.18.0.1	\N	qa.layout.phone@proofolio-test.dev	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/154.0.0.0 Safari/537.36	{}	2026-10-04 17:30:33.21633+00
f7f4f213-b198-4cbe-a7a3-647e06b6815e	login_ok	172.18.0.1	\N	qa.layout.phone@proofolio-test.dev	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/154.0.0.0 Safari/537.36	{}	2026-10-04 17:31:25.462915+00
7516afed-e002-44dd-81ed-23b007bb33ab	login_ok	172.18.0.1	\N	qa.layout.phone@proofolio-test.dev	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/154.0.0.0 Safari/537.36	{}	2026-10-04 17:31:57.253704+00
669db7e7-47ed-4ae3-a7e7-caaf3dccc626	login_ok	172.18.0.1	\N	qa.layout.phone@proofolio-test.dev	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/154.0.0.0 Safari/537.36	{}	2026-10-04 17:32:22.205755+00
8ae3dca6-ebb2-4510-9e05-e79971b8f831	login_ok	172.18.0.1	\N	qa.layout.phone@proofolio-test.dev	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/154.0.0.0 Safari/537.36	{}	2026-10-04 17:33:05.408538+00
70089fb3-b6a8-4329-8a41-781e6b3b0464	login_ok	172.18.0.6	e6d8ab26-f0d1-415d-84a1-263fba7aade8	ibrahimkimaro00@gmail.com	Mozilla/5.0 (iPhone; CPU iPhone OS 27_0_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/154.0.8037.55 Mobile/15E148 Safari/604.1	{}	2026-10-04 17:47:17.178695+00
2510cbf5-b9bd-4a14-8cc4-8bc4757554da	login_ok	172.18.0.6	e6d8ab26-f0d1-415d-84a1-263fba7aade8	ibrahimkimaro00@gmail.com	Mozilla/5.0 (iPhone; CPU iPhone OS 27_0_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/154.0.8037.55 Mobile/15E148 Safari/604.1	{}	2026-10-04 17:48:54.298488+00
c0fef8d2-f5c4-4000-9fd1-7eac1b638a04	login_ok	172.18.0.6	e6d8ab26-f0d1-415d-84a1-263fba7aade8	ibrahimkimaro00@gmail.com	Mozilla/5.0 (iPhone; CPU iPhone OS 27_0_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/154.0.8037.55 Mobile/15E148 Safari/604.1	{}	2026-10-04 17:53:43.753298+00
65961055-6262-4586-a267-32a49e066ba2	login_ok	172.18.0.6	e6d8ab26-f0d1-415d-84a1-263fba7aade8	ibrahimkimaro00@gmail.com	Mozilla/5.0 (iPhone; CPU iPhone OS 27_0_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/154.0.8037.55 Mobile/15E148 Safari/604.1	{}	2026-10-04 18:15:54.999302+00
229a9bbc-ef93-4b10-a2fa-bdbdb72c25a7	login_ok	172.18.0.6	0442e5cd-e4b7-449d-ae56-8bac0028b958	ibrahimkimaro01@gmail.com	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36	{}	2026-10-04 18:47:18.000367+00
d98f93c4-81e5-4586-bc09-96562b25dbc0	login_ok	172.18.0.6	e6d8ab26-f0d1-415d-84a1-263fba7aade8	ibrahimkimaro00@gmail.com	Mozilla/5.0 (iPhone; CPU iPhone OS 27_0_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/154.0.8037.55 Mobile/15E148 Safari/604.1	{}	2026-10-04 18:47:59.386118+00
023e2827-304f-4de2-994c-9f444e9db124	login_ok	172.18.0.6	0442e5cd-e4b7-449d-ae56-8bac0028b958	ibrahimkimaro01@gmail.com	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36	{}	2026-10-04 18:49:36.927514+00
1ee87c88-714e-4680-9cc2-48007f67705f	login_ok	172.18.0.6	0442e5cd-e4b7-449d-ae56-8bac0028b958	ibrahimkimaro01@gmail.com	Mozilla/5.0 (iPhone; CPU iPhone OS 27_0_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/154.0.8037.55 Mobile/15E148 Safari/604.1	{}	2026-10-04 18:49:50.221747+00
7af748df-674e-40da-aedd-1576c8952714	login_ok	172.18.0.6	e6d8ab26-f0d1-415d-84a1-263fba7aade8	ibrahimkimaro00@gmail.com	Mozilla/5.0 (iPhone; CPU iPhone OS 27_0_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/154.0.8037.55 Mobile/15E148 Safari/604.1	{}	2026-10-04 18:50:36.535847+00
938afca8-28e2-473d-8eea-b7743b036193	login_ok	172.18.0.6	0442e5cd-e4b7-449d-ae56-8bac0028b958	ibrahimkimaro01@gmail.com	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36	{}	2026-10-04 19:47:16.201026+00
4db8b537-7251-49e4-a513-ff2706fb5ad3	login_ok	172.18.0.6	0442e5cd-e4b7-449d-ae56-8bac0028b958	ibrahimkimaro01@gmail.com	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36	{}	2026-10-04 19:47:20.764435+00
1cf50a3f-46a8-4126-b233-a861c229230b	login_ok	172.18.0.6	0442e5cd-e4b7-449d-ae56-8bac0028b958	ibrahimkimaro01@gmail.com	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36	{}	2026-10-04 19:47:28.761515+00
\.


--
-- Data for Name: uploads; Type: TABLE DATA; Schema: public; Owner: ibrahim_kimaro
--

COPY public.uploads (name, owner_id, content_type, is_public, created_at) FROM stdin;
fe932bea308d4c38b61fd145850a8b59.jpg	0442e5cd-e4b7-449d-ae56-8bac0028b958	image/jpeg	t	2026-10-01 10:39:50.113028+00
c7f1c1bc8b574e4384563b3dfd0a928b.jpg	0442e5cd-e4b7-449d-ae56-8bac0028b958	image/jpeg	t	2026-10-01 10:41:14.376987+00
13f5f61c104f40cb814f3ebf7e23c30c.jpg	0442e5cd-e4b7-449d-ae56-8bac0028b958	image/jpeg	t	2026-10-03 12:41:32.854912+00
e4b5cbaf84db4e80aa284b22b4ae659d.pdf	b816fcfb-f11a-4027-b728-a687322fe844	application/pdf	f	2026-10-03 16:55:21.507184+00
e6c0146b4f334e99819f55cf383793d5.jpg	104fa91b-9a67-40fc-8a4c-453e9b380ef8	image/jpeg	f	2026-10-03 16:56:03.484032+00
eaa4b3c7a600463ab5e8849e3ed61004.jpg	e6d8ab26-f0d1-415d-84a1-263fba7aade8	image/jpeg	t	2026-10-04 15:52:36.25507+00
0da3959cb7d6496f8aabe08dbf7bff6b.png	b816fcfb-f11a-4027-b728-a687322fe844	image/png	t	2026-10-04 17:33:30.760045+00
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: ibrahim_kimaro
--

COPY public.users (id, email, password_hash, is_active, created_at, updated_at, fullname, username, phone_number, is_admin, preferences, otp_pending, is_guest, activation_deadline) FROM stdin;
104fa91b-9a67-40fc-8a4c-453e9b380ef8	amina.kimaro@gmail.com	$2b$12$UUg2AyrBbgTIV/MlqKyuFuLuS3.AjLD8.zWonI486e2xTOpS9kABi	t	2026-10-03 06:49:28.411727+00	2026-10-03 20:55:02.377742+00	Amina Kimaro	aminak	+255762244981	f	{"appearance": {"text": "default", "tone": "neutral", "glass": "clean", "theme": "light", "accent": "graphite", "custom": "#2563eb", "motion": "system", "contrast": "default"}}	f	f	\N
7badeb71-35ad-4d23-8cf2-3f7a0f90bd0c	7badeb71-35ad-4d23-8cf2-3f7a0f90bd0c@guest.proofolio.local	GUEST_SHADOW_ACCOUNT	t	2026-10-04 13:45:11.238609+00	2026-10-04 14:20:43.098327+00	Sukka · G-40A0	guest_guest-17	\N	f	{}	f	t	\N
08eb4d91-9de2-4856-9adc-0b59f1d8074e	08eb4d91-9de2-4856-9adc-0b59f1d8074e@guest.proofolio.local	GUEST_SHADOW_ACCOUNT	t	2026-10-04 14:40:46.877985+00	2026-10-04 14:40:46.877985+00	Kimmy · G-5452	guest_kimmy-5452	\N	f	{}	f	t	\N
e6d8ab26-f0d1-415d-84a1-263fba7aade8	ibrahimkimaro00@gmail.com	$2b$12$cDA4yXjLm9HD3C3wuX98COB1WTnSBdu03QVqR./ZfnJyvlaePXxES	t	2026-10-04 14:54:48.360723+00	2026-10-04 14:57:34.829884+00	Sean wallace 	sean-wallace	0628726374	f	{}	f	f	\N
7dd010d7-164d-4879-ba77-da00faf76756	isackhaule1903@gmail.com	$2b$12$GK4qToZm0lbOGcclafVYzecxAXWG50Ygiy7gYuzZvmMnAqI9Qtu6K	t	2026-10-04 16:12:35.404056+00	2026-10-04 16:12:35.404056+00	Isack corleone 	isack-corleone	+255758042635	f	{}	t	f	\N
08ecf6ff-fc6b-4453-a969-e2017e76af3b	Mdees9021@gmail.com	$2b$12$GO8UmCbsKrkkEnAMsJFLI.P86iHMgl0sgFZS.eMwnMj1O4ktV8DcO	t	2026-10-04 16:21:15.311567+00	2026-10-04 16:21:15.311567+00	Saidi Mdee	saidi-mdee	\N	f	{}	t	f	\N
b816fcfb-f11a-4027-b728-a687322fe844	admin@homeproofolio.co.tz	$2b$12$VJm95vvHxKm7Ybv2UwarJuO9688QznRC0Hl4Xtqfh7eMGJUk0l3MS	t	2026-09-30 11:51:23.871951+00	2026-10-04 18:27:49.386447+00	Home Proofolio	home_proofolio	0123456789	t	{"appearance": {"text": "default", "tone": "neutral", "glass": "clean", "theme": "light", "accent": "graphite", "custom": "#2563eb", "motion": "system", "contrast": "default"}}	f	f	\N
0442e5cd-e4b7-449d-ae56-8bac0028b958	ibrahimkimaro01@gmail.com	$2b$12$kws.nismNmKPK1VMS.D2NemfUQkFWNrGBhbLdLkox9iUouQ6ilKi.	t	2026-09-30 14:15:33.531282+00	2026-10-04 19:58:47.046901+00	Ibrahim Issa Kimaro	therealkimmy	+255628726374	f	{"privacy": {"show_phone_in_chat": false}, "appearance": {"text": "default", "tone": "neutral", "glass": "clean", "theme": "dark", "accent": "graphite", "custom": "#955f14", "motion": "system", "contrast": "default"}}	f	f	\N
\.


--
-- Data for Name: visitor_messages; Type: TABLE DATA; Schema: public; Owner: ibrahim_kimaro
--

COPY public.visitor_messages (id, owner_id, name, email, body, ip, created_at, read_at) FROM stdin;
\.


--
-- Data for Name: watches; Type: TABLE DATA; Schema: public; Owner: ibrahim_kimaro
--

COPY public.watches (id, user_id, work_id, created_at) FROM stdin;
82e67950-97a6-410d-af3c-0819ea9d770d	0442e5cd-e4b7-449d-ae56-8bac0028b958	27bf2b97-a8b6-4d5f-b783-856ed5364bbf	2026-10-04 19:01:44.797118+00
\.


--
-- Data for Name: work_events; Type: TABLE DATA; Schema: public; Owner: ibrahim_kimaro
--

COPY public.work_events (id, work_id, user_id, field, old_value, new_value, created_at) FROM stdin;
f72db3a0-94b6-4183-8d3e-8725c9409a69	83058b0e-bde4-46bb-ba00-23ea8fd12e2e	e6d8ab26-f0d1-415d-84a1-263fba7aade8	created	\N	work	2026-10-04 14:54:50.805471+00
d4b965b4-6bca-4c36-b9f0-d24b79e757c2	f754eb17-3344-42ca-8ac8-0463507cd664	7dd010d7-164d-4879-ba77-da00faf76756	created	\N	work	2026-10-04 16:12:37.077322+00
d9316250-dad9-4ebe-97c3-9c8186f1e51b	cca4b17c-7aea-4ec1-b148-73cb577a1ebb	08ecf6ff-fc6b-4453-a969-e2017e76af3b	created	\N	work	2026-10-04 16:21:17.106066+00
\.


--
-- Data for Name: work_items; Type: TABLE DATA; Schema: public; Owner: ibrahim_kimaro
--

COPY public.work_items (id, user_id, title, description, context_role, occurred_on, work_type, status, visibility, skills, custom_attributes, evidence_links, created_at, updated_at, template, source_id) FROM stdin;
8f21c512-bd8b-43ee-9a66-095a00bd48f6	0442e5cd-e4b7-449d-ae56-8bac0028b958	Engineered offline-first sync queue for distributed clinic records	Designed and deployed an offline-tolerant replication protocol that buffers patient consultations locally in SQLite and synchronizes conflict-free delta patches with regional hospital servers upon network restoration.	Lead Systems Engineer	2025-11-14	work	completed	public	["TypeScript", "React", "SQLite", "CRDT", "WebSockets"]	{"architecture": "Distributed CRDT", "storage_engine": "SQLite WASM", "sync_latency_ms": 180}	[{"url": "https://github.com/therealkimmy/offline-clinic-sync", "type": "repository", "label": "Architecture Specification", "visibility": "public"}]	2026-07-05 07:29:49.026494+00	2026-07-05 07:29:49.026494+00	\N	\N
276c6cdd-e021-4b4b-b94f-8c6c89fa7210	0442e5cd-e4b7-449d-ae56-8bac0028b958	Zero-Trust Access Proxy and Ephemeral Token Revocation Engine	Engineered a low-latency reverse proxy that intercepts ingress microservice traffic, verifies cryptographic claims at the edge, and propagates millisecond session revocation across edge clusters via distributed publish-subscribe streams.	Infrastructure Security Engineer	2026-03-22	work	completed	public	["Go", "OAuth 2.0", "Redis", "eBPF", "TLS 1.3"]	{"throughput_rps": 65000, "revocation_propagation_ms": 12, "protocol": "TLS 1.3 / HTTP/2"}	[{"url": "https://github.com/therealkimmy/zerotrust-token-proxy", "type": "repository", "label": "Proxy Benchmark Report", "visibility": "public"}]	2026-08-19 07:29:49.026494+00	2026-08-19 07:29:49.026494+00	\N	\N
27bf2b97-a8b6-4d5f-b783-856ed5364bbf	0442e5cd-e4b7-449d-ae56-8bac0028b958	Automated Network Packet Inspection and Audit Logging Pipeline	Implemented a streaming audit pipeline capable of ingesting and analyzing 45,000 network flows per second. Detects protocol anomalies, records immutable tamper-evident logs, and feeds threat intelligence dashboards without degrading core network throughput.	Cybersecurity Architect	2026-07-09	work	completed	public	["Python", "Kafka", "PostgreSQL", "Wireshark", "Linux Kernel"]	{"flow_ingest_rate_sec": 45000, "compression_ratio": "4.2:1", "compliance": "ISO 27001 / SOC 2"}	[{"url": "https://github.com/therealkimmy/packet-audit-pipeline", "type": "document", "label": "Technical Whitepaper", "visibility": "public"}]	2026-09-23 07:29:49.026494+00	2026-09-23 07:29:49.026494+00	\N	\N
b265e346-e69b-49af-9d13-b25dddbfa7b0	0442e5cd-e4b7-449d-ae56-8bac0028b958	Mitigating Concurrency Conflicts in PostgreSQL Row-Level Locking	A technical examination comparing SELECT ... FOR UPDATE, optimistic concurrency controls, and transaction isolation levels under heavy write loads, with empirical benchmarks measuring deadlock frequency.	Systems Research	2026-01-18	learning	understanding	public	["PostgreSQL", "Concurrency Control", "ACID Transactions", "Database Systems"]	{"estimated_reading_minutes": 8, "peer_reviewed": true}	[{"url": "https://therealkimmy.dev/articles/postgres-locking-concurrency", "type": "document", "label": "Technical Draft & Benchmarks", "visibility": "public"}]	2026-07-15 07:29:49.026494+00	2026-07-15 07:29:49.026494+00	\N	\N
9ee091c8-40f6-47bb-8afb-a7f990660ff2	0442e5cd-e4b7-449d-ae56-8bac0028b958	State Synchronization and Reconnection Strategies in Phoenix Channels	Detailed guide exploring how ephemeral channel state, backpressure control, and sequence numbers ensure seamless client re-synchronization across intermittent mobile connections.	Technical Writing	2026-05-30	learning	understanding	public	["Elixir", "Phoenix Framework", "WebSockets", "Distributed Systems"]	{"estimated_reading_minutes": 11, "code_samples": true}	[{"url": "https://therealkimmy.dev/articles/phoenix-channel-reconnection", "type": "document", "label": "Published Deep-Dive", "visibility": "public"}]	2026-09-03 07:29:49.026494+00	2026-09-03 07:29:49.026494+00	\N	\N
29e325e2-8951-4032-8f79-f40a00f7e3d7	0442e5cd-e4b7-449d-ae56-8bac0028b958	Practical Defense-in-Depth for Modern Web API Endpoints	Comprehensive breakdown of cryptographic request signing, strict CORS policies, token rotation semantics, and defensive middleware architecture for mission-critical web backends.	Security Research	2026-09-12	learning	understanding	public	["Information Security", "API Hardening", "Rate Limiting", "Cryptography"]	{"estimated_reading_minutes": 9, "framework_version": "2.4"}	[{"url": "https://therealkimmy.dev/articles/api-defense-in-depth", "type": "document", "label": "Security Framework Document", "visibility": "public"}]	2026-09-28 07:29:49.026494+00	2026-09-28 07:29:49.026494+00	\N	\N
d2decf22-eed8-4217-966a-3888fa3c9fa0	104fa91b-9a67-40fc-8a4c-453e9b380ef8	Deployment of Digital Triage and Electronic Patient Flow Protocol	Standardized the emergency department intake workflow by introducing a verified South African Triage Scale (SATS) algorithmic scoring system, reducing patient wait-to-triage time by 42% across 8,500 monthly admissions.	Emergency Department Medical Officer	2025-10-05	work	completed	public	["Emergency Medicine", "Clinical Triage", "Patient Flow Analysis", "Healthcare Operations"]	{"monthly_patient_volume": 8500, "triage_time_reduction_percent": 42, "clinical_setting": "Emergency Department"}	[{"url": "https://clinicaltrials.health.gov/studies/ED-Triage-Protocol", "type": "document", "label": "Triage Implementation Report", "visibility": "public"}]	2026-06-05 07:29:49.026494+00	2026-06-05 07:29:49.026494+00	\N	\N
2c44528c-72c2-47c5-9496-7528e0470a54	104fa91b-9a67-40fc-8a4c-453e9b380ef8	Clinical Audit on Antimicrobial Stewardship and Surgical Prophylaxis	Conducted a comprehensive 6-month retrospective and prospective clinical audit evaluating postoperative antibiotic prophylaxis adherence, resulting in hospital-wide updated prescribing guidelines that reduced unnecessary broad-spectrum antibiotic usage by 31%.	Clinical Investigator	2026-02-19	work	completed	public	["Infectious Diseases", "Pharmacovigilance", "Biostatistics", "Clinical Audit"]	{"audit_cohort_size": 1240, "adherence_improvement_percent": 31, "audit_duration_months": 6}	[{"url": "https://journal.publichealth.tz/audits/antimicrobial-stewardship", "type": "document", "label": "Clinical Audit Summary", "visibility": "public"}]	2026-08-04 07:29:49.026494+00	2026-08-04 07:29:49.026494+00	\N	\N
c51067c4-dc07-4761-8445-0ce0fad0dcd0	104fa91b-9a67-40fc-8a4c-453e9b380ef8	Integration of HL7 FHIR Diagnostic Data Flow for District Laboratories	Directed the clinical mapping and validation schema for transmitting automated complete blood count (CBC) and biochemistry diagnostic panels from laboratory analyzers directly into provincial electronic health records using standardized HL7 FHIR observation bundles.	Clinical Informatics Lead	2026-06-15	work	completed	public	["HL7 FHIR", "Health Informatics", "EHR Interoperability", "Laboratory Information Systems"]	{"fhir_version": "R4", "connected_analyzers": 18, "diagnostic_accuracy_percent": 99.8}	[{"url": "https://healthdata.org/projects/district-lab-fhir", "type": "document", "label": "FHIR Integration Architecture", "visibility": "public"}]	2026-09-13 07:29:49.026494+00	2026-09-13 07:29:49.026494+00	\N	\N
6f63a568-4114-4089-be84-cf8b6b852151	104fa91b-9a67-40fc-8a4c-453e9b380ef8	Standardizing Health Data Exchange: A Clinicians Perspective on HL7 FHIR	An in-depth review explaining why legacy PDF medical reports hinder cross-facility patient care, and how FHIR resources (Patient, Condition, Encounter, Observation) establish meaningful semantic interoperability.	Medical Informatics Research	2026-01-10	learning	understanding	public	["Health Informatics", "HL7 FHIR", "Data Standards", "EHR Interoperability"]	{"target_audience": "Clinicians and Hospital IT", "reading_minutes": 10}	[{"url": "https://digitalhealth.org/articles/clinician-guide-to-fhir", "type": "document", "label": "Published Review Paper", "visibility": "public"}]	2026-06-30 07:29:49.026494+00	2026-06-30 07:29:49.026494+00	\N	\N
1d4ba2d1-989a-4f58-a27e-83f724b3bb6c	104fa91b-9a67-40fc-8a4c-453e9b380ef8	Clinical Decision Support Systems in Resource-Constrained Emergency Centers	Analysis of rule-based digital alerts versus clinician alert fatigue in high-volume rural trauma centers. Examines optimal alert thresholds for severe sepsis, acute coronary syndrome, and pediatric respiratory distress.	Emergency Medicine Informatics	2026-04-25	learning	understanding	public	["Clinical Decision Support", "Emergency Medicine", "Health Technology", "Quality of Care"]	{"clinical_domain": "Acute Emergency Care", "reading_minutes": 12}	[{"url": "https://digitalhealth.org/articles/cdss-emergency-resource-limited", "type": "document", "label": "Clinical Monograph", "visibility": "public"}]	2026-08-24 07:29:49.026494+00	2026-08-24 07:29:49.026494+00	\N	\N
22efa12c-23f3-4ab3-8aa2-4f7ecb79c14c	104fa91b-9a67-40fc-8a4c-453e9b380ef8	Early Sepsis Recognition: Comparative Efficacy of qSOFA vs SIRS Criteria	Synthesis of international clinical trials evaluating quick Sequential Organ Failure Assessment (qSOFA) versus traditional Systemic Inflammatory Response Syndrome (SIRS) scoring for bedside recognition of septic shock in district hospitals.	Critical Care Review	2026-08-08	learning	understanding	public	["Critical Care", "Sepsis Protocols", "Internal Medicine", "Evidence-Based Practice"]	{"evidence_level": "Level 1A Systematic Review", "reading_minutes": 14}	[{"url": "https://medicaljournal.co.tz/articles/sepsis-recognition-qsofa-sirs", "type": "document", "label": "Clinical Review", "visibility": "public"}]	2026-09-26 07:29:49.026494+00	2026-09-26 07:29:49.026494+00	\N	\N
83058b0e-bde4-46bb-ba00-23ea8fd12e2e	e6d8ab26-f0d1-415d-84a1-263fba7aade8	Hacking or crdb and kbc bank 	\N	\N	\N	work	completed	private	["penetration tester", "social engeneering", "malware attacker", "spoofing attcker"]	{"glass_style": "liquid", "accent_tone": "brass", "palette": "slate"}	[]	2026-10-04 14:54:50.805471+00	2026-10-04 14:54:50.805471+00	developer	\N
f754eb17-3344-42ca-8ac8-0463507cd664	7dd010d7-164d-4879-ba77-da00faf76756	Engineered offline-first sync queue for clinic records	\N	\N	\N	work	completed	private	["TypeScript", "React", "SQLite"]	{"glass_style": "liquid", "accent_tone": "brass", "palette": "slate"}	[]	2026-10-04 16:12:37.077322+00	2026-10-04 16:12:37.077322+00	developer	\N
cca4b17c-7aea-4ec1-b148-73cb577a1ebb	08ecf6ff-fc6b-4453-a969-e2017e76af3b	Engineered offline-first sync queue for clinic records	\N	\N	\N	work	completed	private	["TypeScript", "React", "SQLite"]	{"glass_style": "liquid", "accent_tone": "brass", "palette": "slate"}	[]	2026-10-04 16:21:17.106066+00	2026-10-04 16:21:17.106066+00	developer	\N
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

SELECT pg_catalog.setval('public.chat_messages_id_seq', 468, true);


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
-- Name: chat_clears chat_clears_pkey; Type: CONSTRAINT; Schema: public; Owner: ibrahim_kimaro
--

ALTER TABLE ONLY public.chat_clears
    ADD CONSTRAINT chat_clears_pkey PRIMARY KEY (user_id, topic);


--
-- Name: chat_group_members chat_group_members_pkey; Type: CONSTRAINT; Schema: public; Owner: ibrahim_kimaro
--

ALTER TABLE ONLY public.chat_group_members
    ADD CONSTRAINT chat_group_members_pkey PRIMARY KEY (group_id, user_id);


--
-- Name: chat_groups chat_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: ibrahim_kimaro
--

ALTER TABLE ONLY public.chat_groups
    ADD CONSTRAINT chat_groups_pkey PRIMARY KEY (id);


--
-- Name: chat_groups chat_groups_slug_key; Type: CONSTRAINT; Schema: public; Owner: ibrahim_kimaro
--

ALTER TABLE ONLY public.chat_groups
    ADD CONSTRAINT chat_groups_slug_key UNIQUE (slug);


--
-- Name: chat_messages chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: ibrahim_kimaro
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);


--
-- Name: comments comments_pkey; Type: CONSTRAINT; Schema: public; Owner: ibrahim_kimaro
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_pkey PRIMARY KEY (id);


--
-- Name: cv_requests cv_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: ibrahim_kimaro
--

ALTER TABLE ONLY public.cv_requests
    ADD CONSTRAINT cv_requests_pkey PRIMARY KEY (id);


--
-- Name: cvs cvs_pkey; Type: CONSTRAINT; Schema: public; Owner: ibrahim_kimaro
--

ALTER TABLE ONLY public.cvs
    ADD CONSTRAINT cvs_pkey PRIMARY KEY (user_id);


--
-- Name: cvs cvs_share_token_key; Type: CONSTRAINT; Schema: public; Owner: ibrahim_kimaro
--

ALTER TABLE ONLY public.cvs
    ADD CONSTRAINT cvs_share_token_key UNIQUE (share_token);


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
-- Name: guests guests_pkey; Type: CONSTRAINT; Schema: public; Owner: ibrahim_kimaro
--

ALTER TABLE ONLY public.guests
    ADD CONSTRAINT guests_pkey PRIMARY KEY (id);


--
-- Name: guests guests_session_id_key; Type: CONSTRAINT; Schema: public; Owner: ibrahim_kimaro
--

ALTER TABLE ONLY public.guests
    ADD CONSTRAINT guests_session_id_key UNIQUE (session_id);


--
-- Name: guests guests_user_id_key; Type: CONSTRAINT; Schema: public; Owner: ibrahim_kimaro
--

ALTER TABLE ONLY public.guests
    ADD CONSTRAINT guests_user_id_key UNIQUE (user_id);


--
-- Name: likes likes_pkey; Type: CONSTRAINT; Schema: public; Owner: ibrahim_kimaro
--

ALTER TABLE ONLY public.likes
    ADD CONSTRAINT likes_pkey PRIMARY KEY (id);


--
-- Name: likes likes_user_id_target_kind_target_id_key; Type: CONSTRAINT; Schema: public; Owner: ibrahim_kimaro
--

ALTER TABLE ONLY public.likes
    ADD CONSTRAINT likes_user_id_target_kind_target_id_key UNIQUE (user_id, target_kind, target_id);


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
-- Name: push_subscriptions push_subscriptions_endpoint_key; Type: CONSTRAINT; Schema: public; Owner: ibrahim_kimaro
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_endpoint_key UNIQUE (endpoint);


--
-- Name: push_subscriptions push_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: ibrahim_kimaro
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_pkey PRIMARY KEY (id);


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
-- Name: visitor_messages visitor_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: ibrahim_kimaro
--

ALTER TABLE ONLY public.visitor_messages
    ADD CONSTRAINT visitor_messages_pkey PRIMARY KEY (id);


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
-- Name: ix_chat_group_members_user; Type: INDEX; Schema: public; Owner: ibrahim_kimaro
--

CREATE INDEX ix_chat_group_members_user ON public.chat_group_members USING btree (user_id, status);


--
-- Name: ix_chat_messages_topic_attachment; Type: INDEX; Schema: public; Owner: ibrahim_kimaro
--

CREATE INDEX ix_chat_messages_topic_attachment ON public.chat_messages USING btree (topic, id) WHERE (attachment IS NOT NULL);


--
-- Name: ix_chat_messages_topic_id; Type: INDEX; Schema: public; Owner: ibrahim_kimaro
--

CREATE INDEX ix_chat_messages_topic_id ON public.chat_messages USING btree (topic, id);


--
-- Name: ix_chat_messages_unread; Type: INDEX; Schema: public; Owner: ibrahim_kimaro
--

CREATE INDEX ix_chat_messages_unread ON public.chat_messages USING btree (recipient_id) WHERE (read_at IS NULL);


--
-- Name: ix_comments_target; Type: INDEX; Schema: public; Owner: ibrahim_kimaro
--

CREATE INDEX ix_comments_target ON public.comments USING btree (target_kind, target_id);


--
-- Name: ix_comments_user_id; Type: INDEX; Schema: public; Owner: ibrahim_kimaro
--

CREATE INDEX ix_comments_user_id ON public.comments USING btree (user_id);


--
-- Name: ix_cv_requests_owner_id; Type: INDEX; Schema: public; Owner: ibrahim_kimaro
--

CREATE INDEX ix_cv_requests_owner_id ON public.cv_requests USING btree (owner_id);


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
-- Name: ix_guests_session_id; Type: INDEX; Schema: public; Owner: ibrahim_kimaro
--

CREATE INDEX ix_guests_session_id ON public.guests USING btree (session_id);


--
-- Name: ix_likes_target; Type: INDEX; Schema: public; Owner: ibrahim_kimaro
--

CREATE INDEX ix_likes_target ON public.likes USING btree (target_kind, target_id);


--
-- Name: ix_likes_user_id; Type: INDEX; Schema: public; Owner: ibrahim_kimaro
--

CREATE INDEX ix_likes_user_id ON public.likes USING btree (user_id);


--
-- Name: ix_notifications_broadcast_id; Type: INDEX; Schema: public; Owner: ibrahim_kimaro
--

CREATE INDEX ix_notifications_broadcast_id ON public.notifications USING btree (broadcast_id);


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
-- Name: ix_push_subscriptions_user_id; Type: INDEX; Schema: public; Owner: ibrahim_kimaro
--

CREATE INDEX ix_push_subscriptions_user_id ON public.push_subscriptions USING btree (user_id);


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
-- Name: ix_visitor_messages_owner_id; Type: INDEX; Schema: public; Owner: ibrahim_kimaro
--

CREATE INDEX ix_visitor_messages_owner_id ON public.visitor_messages USING btree (owner_id);


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
-- Name: chat_clears chat_clears_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ibrahim_kimaro
--

ALTER TABLE ONLY public.chat_clears
    ADD CONSTRAINT chat_clears_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: chat_group_members chat_group_members_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ibrahim_kimaro
--

ALTER TABLE ONLY public.chat_group_members
    ADD CONSTRAINT chat_group_members_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.chat_groups(id) ON DELETE CASCADE;


--
-- Name: chat_group_members chat_group_members_invited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ibrahim_kimaro
--

ALTER TABLE ONLY public.chat_group_members
    ADD CONSTRAINT chat_group_members_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: chat_group_members chat_group_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ibrahim_kimaro
--

ALTER TABLE ONLY public.chat_group_members
    ADD CONSTRAINT chat_group_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: chat_groups chat_groups_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ibrahim_kimaro
--

ALTER TABLE ONLY public.chat_groups
    ADD CONSTRAINT chat_groups_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


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
-- Name: comments comments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ibrahim_kimaro
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: cv_requests cv_requests_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ibrahim_kimaro
--

ALTER TABLE ONLY public.cv_requests
    ADD CONSTRAINT cv_requests_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: cv_requests cv_requests_requester_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ibrahim_kimaro
--

ALTER TABLE ONLY public.cv_requests
    ADD CONSTRAINT cv_requests_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: cvs cvs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ibrahim_kimaro
--

ALTER TABLE ONLY public.cvs
    ADD CONSTRAINT cvs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


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
-- Name: guests guests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ibrahim_kimaro
--

ALTER TABLE ONLY public.guests
    ADD CONSTRAINT guests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: likes likes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ibrahim_kimaro
--

ALTER TABLE ONLY public.likes
    ADD CONSTRAINT likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_broadcast_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ibrahim_kimaro
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_broadcast_id_fkey FOREIGN KEY (broadcast_id) REFERENCES public.broadcasts(id) ON DELETE SET NULL;


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
-- Name: push_subscriptions push_subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ibrahim_kimaro
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


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
-- Name: visitor_messages visitor_messages_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ibrahim_kimaro
--

ALTER TABLE ONLY public.visitor_messages
    ADD CONSTRAINT visitor_messages_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE CASCADE;


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
-- PostgreSQL database dump complete
--

\unrestrict r3jEA0iAyg8TiaHFREOpQPqJVeUK7Vf8QubTdEUlcBDLneCUwMXtB7Pgen4SGJo

