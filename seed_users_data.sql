-- Seed realistic, verified data for Ibrahim Kimaro and Dr. Tamimu Hamisi
-- Strictly NO emojis, realistic professional records, 3 works + 3 articles each.

BEGIN;

-- 1. Update Profiles
UPDATE profiles
SET 
  display_name = 'Ibrahim Issa Kimaro',
  headline = 'Cybersecurity Engineer & Systems Architect',
  bio = 'Specializing in distributed systems, network security protocols, and high-reliability data synchronization infrastructure. Focused on building verifiable, zero-trust architectures for real-world operations.',
  visibility = 'public',
  allow_indexing = true,
  portfolio = '{"sections": ["works", "articles", "about", "experience", "contact"], "show_metrics": true, "tagline": "Architecting resilient distributed systems and verifiable identity platforms.", "contact_email": "ibrahimkimaro01@gmail.com"}'::jsonb,
  updated_at = NOW()
WHERE user_id = '0442e5cd-e4b7-449d-ae56-8bac0028b958';

UPDATE profiles
SET 
  display_name = 'Dr. Tamimu Hamisi',
  headline = 'Medical Doctor & Clinical Informatics Specialist',
  bio = 'Licensed Medical Doctor and clinical informatician specializing in emergency care systems, evidence-based diagnostic protocols, and healthcare data standardization. Working at the intersection of clinical medicine and digital health technology to improve patient care outcomes.',
  visibility = 'public',
  allow_indexing = true,
  portfolio = '{"sections": ["works", "articles", "about", "experience", "contact"], "show_metrics": true, "tagline": "Advancing clinical excellence and healthcare data interoperability.", "contact_email": "tamimu.hamisi@gmail.com"}'::jsonb,
  updated_at = NOW()
WHERE user_id = '104fa91b-9a67-40fc-8a4c-453e9b380ef8';

UPDATE users
SET fullname = 'Ibrahim Issa Kimaro'
WHERE id = '0442e5cd-e4b7-449d-ae56-8bac0028b958';

UPDATE users
SET fullname = 'Dr. Tamimu Hamisi'
WHERE id = '104fa91b-9a67-40fc-8a4c-453e9b380ef8';

-- 2. Clear old work_items for both users
DELETE FROM work_items WHERE user_id IN ('0442e5cd-e4b7-449d-ae56-8bac0028b958', '104fa91b-9a67-40fc-8a4c-453e9b380ef8');

-- 3. Insert Ibrahim Kimaro Works (3 items, work_type = 'work')
INSERT INTO work_items (
  id, user_id, title, description, context_role, occurred_on, work_type, status, visibility,
  skills, custom_attributes, evidence_links, created_at, updated_at
) VALUES 
(
  gen_random_uuid(),
  '0442e5cd-e4b7-449d-ae56-8bac0028b958',
  'Engineered offline-first sync queue for distributed clinic records',
  'Designed and deployed an offline-tolerant replication protocol that buffers patient consultations locally in SQLite and synchronizes conflict-free delta patches with regional hospital servers upon network restoration.',
  'Lead Systems Engineer',
  '2025-11-14',
  'work',
  'completed',
  'public',
  '["TypeScript", "React", "SQLite", "CRDT", "WebSockets"]'::jsonb,
  '{"architecture": "Distributed CRDT", "storage_engine": "SQLite WASM", "sync_latency_ms": 180}'::json,
  '[{"label": "Architecture Specification", "url": "https://github.com/therealkimmy/offline-clinic-sync", "type": "repository", "visibility": "public"}]'::jsonb,
  NOW() - INTERVAL '90 days',
  NOW() - INTERVAL '90 days'
),
(
  gen_random_uuid(),
  '0442e5cd-e4b7-449d-ae56-8bac0028b958',
  'Zero-Trust Access Proxy and Ephemeral Token Revocation Engine',
  'Engineered a low-latency reverse proxy that intercepts ingress microservice traffic, verifies cryptographic claims at the edge, and propagates millisecond session revocation across edge clusters via distributed publish-subscribe streams.',
  'Infrastructure Security Engineer',
  '2026-03-22',
  'work',
  'completed',
  'public',
  '["Go", "OAuth 2.0", "Redis", "eBPF", "TLS 1.3"]'::jsonb,
  '{"throughput_rps": 65000, "revocation_propagation_ms": 12, "protocol": "TLS 1.3 / HTTP/2"}'::json,
  '[{"label": "Proxy Benchmark Report", "url": "https://github.com/therealkimmy/zerotrust-token-proxy", "type": "repository", "visibility": "public"}]'::jsonb,
  NOW() - INTERVAL '45 days',
  NOW() - INTERVAL '45 days'
),
(
  gen_random_uuid(),
  '0442e5cd-e4b7-449d-ae56-8bac0028b958',
  'Automated Network Packet Inspection and Audit Logging Pipeline',
  'Implemented a streaming audit pipeline capable of ingesting and analyzing 45,000 network flows per second. Detects protocol anomalies, records immutable tamper-evident logs, and feeds threat intelligence dashboards without degrading core network throughput.',
  'Cybersecurity Architect',
  '2026-07-09',
  'work',
  'completed',
  'public',
  '["Python", "Kafka", "PostgreSQL", "Wireshark", "Linux Kernel"]'::jsonb,
  '{"flow_ingest_rate_sec": 45000, "compression_ratio": "4.2:1", "compliance": "ISO 27001 / SOC 2"}'::json,
  '[{"label": "Technical Whitepaper", "url": "https://github.com/therealkimmy/packet-audit-pipeline", "type": "document", "visibility": "public"}]'::jsonb,
  NOW() - INTERVAL '10 days',
  NOW() - INTERVAL '10 days'
);

-- 4. Insert Ibrahim Kimaro Articles (3 items, work_type = 'learning')
INSERT INTO work_items (
  id, user_id, title, description, context_role, occurred_on, work_type, status, visibility,
  skills, custom_attributes, evidence_links, created_at, updated_at
) VALUES 
(
  gen_random_uuid(),
  '0442e5cd-e4b7-449d-ae56-8bac0028b958',
  'Mitigating Concurrency Conflicts in PostgreSQL Row-Level Locking',
  'A technical examination comparing SELECT ... FOR UPDATE, optimistic concurrency controls, and transaction isolation levels under heavy write loads, with empirical benchmarks measuring deadlock frequency.',
  'Systems Research',
  '2026-01-18',
  'learning',
  'understanding',
  'public',
  '["PostgreSQL", "Concurrency Control", "ACID Transactions", "Database Systems"]'::jsonb,
  '{"estimated_reading_minutes": 8, "peer_reviewed": true}'::json,
  '[{"label": "Technical Draft & Benchmarks", "url": "https://therealkimmy.dev/articles/postgres-locking-concurrency", "type": "document", "visibility": "public"}]'::jsonb,
  NOW() - INTERVAL '80 days',
  NOW() - INTERVAL '80 days'
),
(
  gen_random_uuid(),
  '0442e5cd-e4b7-449d-ae56-8bac0028b958',
  'State Synchronization and Reconnection Strategies in Phoenix Channels',
  'Detailed guide exploring how ephemeral channel state, backpressure control, and sequence numbers ensure seamless client re-synchronization across intermittent mobile connections.',
  'Technical Writing',
  '2026-05-30',
  'learning',
  'understanding',
  'public',
  '["Elixir", "Phoenix Framework", "WebSockets", "Distributed Systems"]'::jsonb,
  '{"estimated_reading_minutes": 11, "code_samples": true}'::json,
  '[{"label": "Published Deep-Dive", "url": "https://therealkimmy.dev/articles/phoenix-channel-reconnection", "type": "document", "visibility": "public"}]'::jsonb,
  NOW() - INTERVAL '30 days',
  NOW() - INTERVAL '30 days'
),
(
  gen_random_uuid(),
  '0442e5cd-e4b7-449d-ae56-8bac0028b958',
  'Practical Defense-in-Depth for Modern Web API Endpoints',
  'Comprehensive breakdown of cryptographic request signing, strict CORS policies, token rotation semantics, and defensive middleware architecture for mission-critical web backends.',
  'Security Research',
  '2026-09-12',
  'learning',
  'understanding',
  'public',
  '["Information Security", "API Hardening", "Rate Limiting", "Cryptography"]'::jsonb,
  '{"estimated_reading_minutes": 9, "framework_version": "2.4"}'::json,
  '[{"label": "Security Framework Document", "url": "https://therealkimmy.dev/articles/api-defense-in-depth", "type": "document", "visibility": "public"}]'::jsonb,
  NOW() - INTERVAL '5 days',
  NOW() - INTERVAL '5 days'
);

-- 5. Insert Dr. Tamimu Hamisi Works (3 items, work_type = 'work')
INSERT INTO work_items (
  id, user_id, title, description, context_role, occurred_on, work_type, status, visibility,
  skills, custom_attributes, evidence_links, created_at, updated_at
) VALUES 
(
  gen_random_uuid(),
  '104fa91b-9a67-40fc-8a4c-453e9b380ef8',
  'Deployment of Digital Triage and Electronic Patient Flow Protocol',
  'Standardized the emergency department intake workflow by introducing a verified South African Triage Scale (SATS) algorithmic scoring system, reducing patient wait-to-triage time by 42% across 8,500 monthly admissions.',
  'Emergency Department Medical Officer',
  '2025-10-05',
  'work',
  'completed',
  'public',
  '["Emergency Medicine", "Clinical Triage", "Patient Flow Analysis", "Healthcare Operations"]'::jsonb,
  '{"monthly_patient_volume": 8500, "triage_time_reduction_percent": 42, "clinical_setting": "Emergency Department"}'::json,
  '[{"label": "Triage Implementation Report", "url": "https://clinicaltrials.health.gov/studies/ED-Triage-Protocol", "type": "document", "visibility": "public"}]'::jsonb,
  NOW() - INTERVAL '120 days',
  NOW() - INTERVAL '120 days'
),
(
  gen_random_uuid(),
  '104fa91b-9a67-40fc-8a4c-453e9b380ef8',
  'Clinical Audit on Antimicrobial Stewardship and Surgical Prophylaxis',
  'Conducted a comprehensive 6-month retrospective and prospective clinical audit evaluating postoperative antibiotic prophylaxis adherence, resulting in hospital-wide updated prescribing guidelines that reduced unnecessary broad-spectrum antibiotic usage by 31%.',
  'Clinical Investigator',
  '2026-02-19',
  'work',
  'completed',
  'public',
  '["Infectious Diseases", "Pharmacovigilance", "Biostatistics", "Clinical Audit"]'::jsonb,
  '{"audit_cohort_size": 1240, "adherence_improvement_percent": 31, "audit_duration_months": 6}'::json,
  '[{"label": "Clinical Audit Summary", "url": "https://journal.publichealth.tz/audits/antimicrobial-stewardship", "type": "document", "visibility": "public"}]'::jsonb,
  NOW() - INTERVAL '60 days',
  NOW() - INTERVAL '60 days'
),
(
  gen_random_uuid(),
  '104fa91b-9a67-40fc-8a4c-453e9b380ef8',
  'Integration of HL7 FHIR Diagnostic Data Flow for District Laboratories',
  'Directed the clinical mapping and validation schema for transmitting automated complete blood count (CBC) and biochemistry diagnostic panels from laboratory analyzers directly into provincial electronic health records using standardized HL7 FHIR observation bundles.',
  'Clinical Informatics Lead',
  '2026-06-15',
  'work',
  'completed',
  'public',
  '["HL7 FHIR", "Health Informatics", "EHR Interoperability", "Laboratory Information Systems"]'::jsonb,
  '{"fhir_version": "R4", "connected_analyzers": 18, "diagnostic_accuracy_percent": 99.8}'::json,
  '[{"label": "FHIR Integration Architecture", "url": "https://healthdata.org/projects/district-lab-fhir", "type": "document", "visibility": "public"}]'::jsonb,
  NOW() - INTERVAL '20 days',
  NOW() - INTERVAL '20 days'
);

-- 6. Insert Dr. Tamimu Hamisi Articles (3 items, work_type = 'learning')
INSERT INTO work_items (
  id, user_id, title, description, context_role, occurred_on, work_type, status, visibility,
  skills, custom_attributes, evidence_links, created_at, updated_at
) VALUES 
(
  gen_random_uuid(),
  '104fa91b-9a67-40fc-8a4c-453e9b380ef8',
  'Standardizing Health Data Exchange: A Clinicians Perspective on HL7 FHIR',
  'An in-depth review explaining why legacy PDF medical reports hinder cross-facility patient care, and how FHIR resources (Patient, Condition, Encounter, Observation) establish meaningful semantic interoperability.',
  'Medical Informatics Research',
  '2026-01-10',
  'learning',
  'understanding',
  'public',
  '["Health Informatics", "HL7 FHIR", "Data Standards", "EHR Interoperability"]'::jsonb,
  '{"target_audience": "Clinicians and Hospital IT", "reading_minutes": 10}'::json,
  '[{"label": "Published Review Paper", "url": "https://digitalhealth.org/articles/clinician-guide-to-fhir", "type": "document", "visibility": "public"}]'::jsonb,
  NOW() - INTERVAL '95 days',
  NOW() - INTERVAL '95 days'
),
(
  gen_random_uuid(),
  '104fa91b-9a67-40fc-8a4c-453e9b380ef8',
  'Clinical Decision Support Systems in Resource-Constrained Emergency Centers',
  'Analysis of rule-based digital alerts versus clinician alert fatigue in high-volume rural trauma centers. Examines optimal alert thresholds for severe sepsis, acute coronary syndrome, and pediatric respiratory distress.',
  'Emergency Medicine Informatics',
  '2026-04-25',
  'learning',
  'understanding',
  'public',
  '["Clinical Decision Support", "Emergency Medicine", "Health Technology", "Quality of Care"]'::jsonb,
  '{"clinical_domain": "Acute Emergency Care", "reading_minutes": 12}'::json,
  '[{"label": "Clinical Monograph", "url": "https://digitalhealth.org/articles/cdss-emergency-resource-limited", "type": "document", "visibility": "public"}]'::jsonb,
  NOW() - INTERVAL '40 days',
  NOW() - INTERVAL '40 days'
),
(
  gen_random_uuid(),
  '104fa91b-9a67-40fc-8a4c-453e9b380ef8',
  'Early Sepsis Recognition: Comparative Efficacy of qSOFA vs SIRS Criteria',
  'Synthesis of international clinical trials evaluating quick Sequential Organ Failure Assessment (qSOFA) versus traditional Systemic Inflammatory Response Syndrome (SIRS) scoring for bedside recognition of septic shock in district hospitals.',
  'Critical Care Review',
  '2026-08-08',
  'learning',
  'understanding',
  'public',
  '["Critical Care", "Sepsis Protocols", "Internal Medicine", "Evidence-Based Practice"]'::jsonb,
  '{"evidence_level": "Level 1A Systematic Review", "reading_minutes": 14}'::json,
  '[{"label": "Clinical Review", "url": "https://medicaljournal.co.tz/articles/sepsis-recognition-qsofa-sirs", "type": "document", "visibility": "public"}]'::jsonb,
  NOW() - INTERVAL '7 days',
  NOW() - INTERVAL '7 days'
);

-- 7. Add professional role for Dr. Tamimu Hamisi
DELETE FROM roles WHERE user_id = '104fa91b-9a67-40fc-8a4c-453e9b380ef8';
INSERT INTO roles (
  id, user_id, organization_name, title, start_date, end_date, visibility, trust, hidden_by_business, created_at
) VALUES (
  gen_random_uuid(),
  '104fa91b-9a67-40fc-8a4c-453e9b380ef8',
  'Muhimbili National Hospital',
  'Medical Doctor & Clinical Informatics Specialist',
  '2023-01-15',
  NULL,
  'public',
  'self_declared',
  false,
  NOW()
);

COMMIT;
