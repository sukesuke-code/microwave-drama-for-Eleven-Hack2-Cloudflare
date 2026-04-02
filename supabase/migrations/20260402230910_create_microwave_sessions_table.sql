/*
  # Create Microwave Show Sessions Table

  1. New Tables
    - `sessions`
      - `id` (uuid, primary key) - Unique session identifier
      - `food_name` (text) - Name of food being microwaved
      - `total_time` (integer) - Total cooking time in seconds
      - `style` (text) - Narration style (sports, horror, documentary, anime)
      - `remaining_time` (integer) - Time remaining in seconds
      - `created_at` (timestamp) - When session was created
      - `updated_at` (timestamp) - When session was last updated
      - `is_completed` (boolean) - Whether the session finished

  2. Security
    - Enable RLS on `sessions` table
    - Public read/write access for sessions (no auth required for this app)
*/

CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  food_name text NOT NULL,
  total_time integer NOT NULL,
  style text NOT NULL CHECK (style IN ('sports', 'horror', 'documentary', 'anime')),
  remaining_time integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_completed boolean DEFAULT false
);

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sessions are publicly readable"
  ON sessions FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Sessions can be created publicly"
  ON sessions FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Sessions can be updated publicly"
  ON sessions FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);