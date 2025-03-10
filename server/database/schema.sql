-- schema.sql
-- Ensure UUID extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Accounts table
CREATE TABLE IF NOT EXISTS accounts (
  account_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(32) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  registration_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login_date TIMESTAMP
);

-- Characters table
CREATE TABLE IF NOT EXISTS characters (
  character_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(account_id),
  name VARCHAR(32) NOT NULL,
  class VARCHAR(32) NOT NULL,
  level INTEGER NOT NULL DEFAULT 1,
  experience INTEGER NOT NULL DEFAULT 0,
  birthstone_one VARCHAR(32) NOT NULL,
  birthstone_two VARCHAR(32) NOT NULL,
  creation_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_played_date TIMESTAMP,
  health INTEGER NOT NULL,
  energy INTEGER NOT NULL,
  health_flask_tier INTEGER NOT NULL DEFAULT 1,
  energy_flask_tier INTEGER NOT NULL DEFAULT 1,
  health_flask_charges INTEGER NOT NULL DEFAULT 3,
  energy_flask_charges INTEGER NOT NULL DEFAULT 3,
  UNIQUE(account_id, name)
);

-- Item inventory
CREATE TABLE IF NOT EXISTS items (
  item_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id VARCHAR(64) NOT NULL,
  owner_id UUID NOT NULL REFERENCES characters(character_id),
  name VARCHAR(64) NOT NULL,
  type VARCHAR(32) NOT NULL,
  rarity VARCHAR(16) NOT NULL,
  level INTEGER NOT NULL DEFAULT 1,
  stat_modifiers JSONB NOT NULL,
  is_equipped BOOLEAN NOT NULL DEFAULT FALSE,
  equip_slot VARCHAR(32),
  stack_count INTEGER NOT NULL DEFAULT 1,
  acquisition_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Friendships
CREATE TABLE IF NOT EXISTS friendships (
  friendship_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id UUID NOT NULL REFERENCES accounts(account_id),
  recipient_id UUID NOT NULL REFERENCES accounts(account_id),
  status VARCHAR(16) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP,
  CHECK (requester_id != recipient_id)
);

-- Guilds
CREATE TABLE IF NOT EXISTS guilds (
  guild_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(32) UNIQUE NOT NULL,
  description TEXT,
  leader_id UUID NOT NULL REFERENCES accounts(account_id),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP
);

-- Guild members
CREATE TABLE IF NOT EXISTS guild_members (
  guild_id UUID REFERENCES guilds(guild_id),
  account_id UUID REFERENCES accounts(account_id),
  role VARCHAR(16) NOT NULL DEFAULT 'member',
  joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (guild_id, account_id)
);

-- Guild invites
CREATE TABLE IF NOT EXISTS guild_invites (
  invite_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guild_id UUID NOT NULL REFERENCES guilds(guild_id),
  account_id UUID NOT NULL REFERENCES accounts(account_id),
  inviter_id UUID NOT NULL REFERENCES accounts(account_id),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes (using IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_characters_account_id ON characters(account_id);
CREATE INDEX IF NOT EXISTS idx_items_owner_id ON items(owner_id);
CREATE INDEX IF NOT EXISTS idx_friendships_requester_id ON friendships(requester_id);
CREATE INDEX IF NOT EXISTS idx_friendships_recipient_id ON friendships(recipient_id);
CREATE INDEX IF NOT EXISTS idx_guild_members_account_id ON guild_members(account_id);
CREATE INDEX IF NOT EXISTS idx_guild_invites_account_id ON guild_invites(account_id);