CREATE TABLE IF NOT EXISTS workflow_events (
  workflow_id text NOT NULL,
  stream_version integer NOT NULL,
  event_id text NOT NULL UNIQUE,
  type text NOT NULL,
  payload jsonb NOT NULL,
  occurred_at timestamptz NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  causation_id text,
  correlation_id text,
  actor_id text NOT NULL,
  schema_version integer NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (workflow_id, stream_version)
);
CREATE TABLE IF NOT EXISTS workflow_snapshots (workflow_id text PRIMARY KEY,stream_version integer NOT NULL,state jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS projection_offsets (projection_name text PRIMARY KEY,last_event_recorded_at timestamptz,last_event_id text,version integer NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS blackboard_entries (entry_id text PRIMARY KEY,workflow_id text NOT NULL,type text NOT NULL,payload jsonb NOT NULL,entry jsonb NOT NULL,validation_status text NOT NULL,created_at timestamptz NOT NULL);
CREATE INDEX IF NOT EXISTS blackboard_workflow_idx ON blackboard_entries(workflow_id,type,validation_status);
CREATE TABLE IF NOT EXISTS blackboard_edges (workflow_id text NOT NULL,from_entry_id text NOT NULL,to_entry_id text NOT NULL,edge_type text NOT NULL,PRIMARY KEY(from_entry_id,to_entry_id,edge_type));
CREATE TABLE IF NOT EXISTS activity_tasks (activity_id text PRIMARY KEY,workflow_id text NOT NULL,activity_type text NOT NULL,input jsonb NOT NULL,idempotency_key text NOT NULL UNIQUE,attempt integer NOT NULL DEFAULT 0,max_attempts integer NOT NULL,state text NOT NULL,available_at timestamptz NOT NULL,lease_owner text,lease_expires_at timestamptz,expected_postconditions jsonb NOT NULL,risk_class text NOT NULL,compensation_id text);
CREATE INDEX IF NOT EXISTS activity_claim_idx ON activity_tasks(state,available_at,lease_expires_at);
CREATE TABLE IF NOT EXISTS activity_attempts (activity_id text NOT NULL,attempt integer NOT NULL,started_at timestamptz NOT NULL,completed_at timestamptz,result jsonb,failure_class text,PRIMARY KEY(activity_id,attempt));
CREATE TABLE IF NOT EXISTS workflow_timers (timer_id text PRIMARY KEY,workflow_id text NOT NULL,type text NOT NULL,fire_at timestamptz NOT NULL,status text NOT NULL,payload jsonb NOT NULL,idempotency_key text NOT NULL UNIQUE,claimed_by text,claim_expires_at timestamptz);
CREATE INDEX IF NOT EXISTS timer_claim_idx ON workflow_timers(status,fire_at);
CREATE TABLE IF NOT EXISTS workflow_signals (signal_id text PRIMARY KEY,workflow_id text NOT NULL,type text NOT NULL,payload jsonb NOT NULL,sent_at timestamptz NOT NULL,sender_id text NOT NULL,idempotency_key text NOT NULL UNIQUE,processed_at timestamptz);
CREATE TABLE IF NOT EXISTS workflow_approvals (approval_id text PRIMARY KEY,workflow_id text NOT NULL,type text NOT NULL,status text NOT NULL,requested_at timestamptz NOT NULL,resolved_at timestamptz,resolved_by text,payload jsonb NOT NULL,idempotency_key text NOT NULL UNIQUE);
CREATE TABLE IF NOT EXISTS outbox_messages (message_id text PRIMARY KEY,workflow_id text NOT NULL,type text NOT NULL,payload jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),published_at timestamptz,attempts integer NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS motif_assessments (workflow_id text NOT NULL,motif_id text NOT NULL,assessment jsonb NOT NULL,updated_at timestamptz NOT NULL,PRIMARY KEY(workflow_id,motif_id));
CREATE TABLE IF NOT EXISTS distortion_instances (instance_id text PRIMARY KEY,workflow_id text NOT NULL,definition_id text NOT NULL,instance jsonb NOT NULL,active boolean NOT NULL,detected_at timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS distortion_edges (workflow_id text NOT NULL,from_instance_id text NOT NULL,to_instance_id text NOT NULL,edge_type text NOT NULL,PRIMARY KEY(from_instance_id,to_instance_id,edge_type));
CREATE TABLE IF NOT EXISTS compensation_registrations (compensation_id text PRIMARY KEY,workflow_id text NOT NULL,forward_activity_id text NOT NULL,activity_type text NOT NULL,input jsonb NOT NULL,required_authority jsonb NOT NULL,verification_policy jsonb NOT NULL,restoration_target text NOT NULL,state text NOT NULL,dependency_order integer NOT NULL);
