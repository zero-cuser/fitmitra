-- FitMitra Production PostgreSQL Database Schema
-- Phase 13: Backend Integration & Account Synchronization
-- Target: Supabase / PostgreSQL 15+ / Self-Hosted Docker Postgres

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================================
-- 0. SCHEMA MIGRATIONS VERSION TRACKING
-- ========================================================
CREATE TABLE IF NOT EXISTS schema_migrations (
    version INT PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    description TEXT
);

-- ========================================================
-- 1. ACCOUNTS & AUTHENTICATION TABLE
-- ========================================================
CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    auth_type TEXT NOT NULL DEFAULT 'authenticated',
    provider TEXT DEFAULT 'email',
    email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_accounts_email ON accounts(email);

-- ========================================================
-- 2. USER APPLICATION PROFILES
-- ========================================================
CREATE TABLE IF NOT EXISTS profiles (
    account_id UUID PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    avatar_color TEXT DEFAULT 'from-cyan-500 to-blue-700',
    hostel_wing TEXT,
    fitness_goal TEXT DEFAULT 'strength',
    preferences_json JSONB DEFAULT '{}'::jsonb,
    biometrics_json JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========================================================
-- 3. WORKOUT RECORDS (APPEND-ONLY WITH STABLE UUIDs)
-- ========================================================
CREATE TABLE IF NOT EXISTS workout_records (
    id TEXT PRIMARY KEY, -- Form: work_<timestamp>_<hex>
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    exercise_key TEXT NOT NULL,
    exercise_name TEXT NOT NULL,
    reps INT NOT NULL CHECK (reps >= 0),
    duration_seconds INT NOT NULL CHECK (duration_seconds >= 0),
    posture_score INT CHECK (posture_score >= 0 AND posture_score <= 100),
    timestamp TIMESTAMPTZ NOT NULL,
    is_hostel_friendly BOOLEAN DEFAULT TRUE,
    completed_fully BOOLEAN DEFAULT TRUE,
    source TEXT DEFAULT 'pose_coach',
    schema_version INT DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workout_account_time ON workout_records(account_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_workout_account_updated ON workout_records(account_id, updated_at DESC);

-- ========================================================
-- 4. CHALLENGE PROGRESS
-- ========================================================
CREATE TABLE IF NOT EXISTS challenge_progress (
    id TEXT PRIMARY KEY, -- Form: part_<accountId>_<challengeId>
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    challenge_id TEXT NOT NULL,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    current_value NUMERIC NOT NULL DEFAULT 0 CHECK (current_value >= 0),
    target_value NUMERIC NOT NULL CHECK (target_value > 0),
    completed_days TEXT[] DEFAULT '{}',
    completed_sessions INT DEFAULT 0,
    processed_activity_ids TEXT[] DEFAULT '{}',
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    schema_version INT DEFAULT 1,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_challenge_account ON challenge_progress(account_id, challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_account_updated ON challenge_progress(account_id, updated_at DESC);

-- ========================================================
-- 5. SYNCHRONIZATION TOMBSTONES (DELETION PROPAGATION)
-- ========================================================
CREATE TABLE IF NOT EXISTS sync_tombstones (
    id TEXT PRIMARY KEY, -- Form: tomb_<timestamp>_<hex>
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL, -- 'workout' | 'challenge'
    entity_id TEXT NOT NULL,
    deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tombstones_account ON sync_tombstones(account_id, deleted_at DESC);

-- ========================================================
-- 6. ROW-LEVEL SECURITY (RLS) POLICIES
-- Strict Owner-Level Isolation: Account A cannot read or write Account B's records
-- ========================================================

-- Enable RLS on all user data tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_tombstones ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can only view, insert, update, or delete their own profile
CREATE POLICY profiles_owner_policy ON profiles
    FOR ALL
    USING (account_id = auth.uid())
    WITH CHECK (account_id = auth.uid());

-- Workout Records: Strict owner access
CREATE POLICY workout_records_owner_policy ON workout_records
    FOR ALL
    USING (account_id = auth.uid())
    WITH CHECK (account_id = auth.uid());

-- Challenge Progress: Strict owner access
CREATE POLICY challenge_progress_owner_policy ON challenge_progress
    FOR ALL
    USING (account_id = auth.uid())
    WITH CHECK (account_id = auth.uid());

-- Sync Tombstones: Strict owner access
CREATE POLICY sync_tombstones_owner_policy ON sync_tombstones
    FOR ALL
    USING (account_id = auth.uid())
    WITH CHECK (account_id = auth.uid());

-- ========================================================
-- 7. PHASE 15: CAMPUS SOCIAL & SHARED CHALLENGES TABLES
-- ========================================================

-- Friend Invitations (Shareable invite codes with expiry)
CREATE TABLE IF NOT EXISTS friend_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    invite_code TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    max_uses INT NOT NULL DEFAULT 5,
    uses_count INT NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_friend_invites_code ON friend_invitations(invite_code);
CREATE INDEX IF NOT EXISTS idx_friend_invites_creator ON friend_invitations(creator_account_id);

-- Friend Relationships (Request, Accept, Decline, Remove)
CREATE TABLE IF NOT EXISTS friend_relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    friend_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
    initiated_by UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT no_self_friendship CHECK (account_id <> friend_account_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_friend_relationships_pair ON friend_relationships(
    LEAST(account_id, friend_account_id),
    GREATEST(account_id, friend_account_id)
);
CREATE INDEX IF NOT EXISTS idx_friendships_account ON friend_relationships(account_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend ON friend_relationships(friend_account_id);

-- Shared Challenges (Private student sprints)
CREATE TABLE IF NOT EXISTS shared_challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'strength',
    type TEXT NOT NULL DEFAULT 'rep_target' CHECK (type IN ('rep_target', 'duration_target', 'session_count', 'streak')),
    target_value NUMERIC NOT NULL CHECK (target_value > 0),
    unit TEXT NOT NULL DEFAULT 'reps',
    exercise_keys TEXT[] DEFAULT '{}',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    max_participants INT NOT NULL DEFAULT 10 CHECK (max_participants >= 2 AND max_participants <= 50),
    invite_code TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shared_challenges_owner ON shared_challenges(owner_account_id);
CREATE INDEX IF NOT EXISTS idx_shared_challenges_code ON shared_challenges(invite_code);

-- Shared Challenge Participants
CREATE TABLE IF NOT EXISTS shared_challenge_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    challenge_id UUID NOT NULL REFERENCES shared_challenges(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'participant' CHECK (role IN ('owner', 'participant')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'left')),
    CONSTRAINT uq_challenge_participant UNIQUE (challenge_id, account_id)
);

CREATE INDEX IF NOT EXISTS idx_challenge_participants_account ON shared_challenge_participants(account_id);

-- Shared Challenge Contributions (Validated workout sessions)
CREATE TABLE IF NOT EXISTS shared_challenge_contributions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    challenge_id UUID NOT NULL REFERENCES shared_challenges(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    activity_id TEXT NOT NULL,
    activity_type TEXT NOT NULL,
    exercise_key TEXT,
    metric_value NUMERIC NOT NULL CHECK (metric_value > 0),
    activity_timestamp TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_challenge_contribution UNIQUE (challenge_id, account_id, activity_id)
);

CREATE INDEX IF NOT EXISTS idx_contributions_challenge ON shared_challenge_contributions(challenge_id);
CREATE INDEX IF NOT EXISTS idx_contributions_account ON shared_challenge_contributions(account_id);

-- ========================================================
-- 8. SOCIAL RLS POLICIES
-- ========================================================
ALTER TABLE friend_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_challenge_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_challenge_contributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY friend_invitations_creator_policy ON friend_invitations
    FOR ALL USING (creator_account_id = auth.uid());

CREATE POLICY friend_relationships_party_policy ON friend_relationships
    FOR ALL USING (account_id = auth.uid() OR friend_account_id = auth.uid());

CREATE POLICY shared_challenges_member_policy ON shared_challenges
    FOR SELECT USING (
        owner_account_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM shared_challenge_participants scp
            WHERE scp.challenge_id = shared_challenges.id
            AND scp.account_id = auth.uid()
            AND scp.status = 'active'
        )
    );

CREATE POLICY shared_challenge_participants_policy ON shared_challenge_participants
    FOR ALL USING (
        account_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM shared_challenges sc
            WHERE sc.id = shared_challenge_participants.challenge_id
            AND sc.owner_account_id = auth.uid()
        )
    );

CREATE POLICY shared_challenge_contributions_policy ON shared_challenge_contributions
    FOR ALL USING (
        account_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM shared_challenge_participants scp
            WHERE scp.challenge_id = shared_challenge_contributions.challenge_id
            AND scp.account_id = auth.uid()
            AND scp.status = 'active'
        )
    );

