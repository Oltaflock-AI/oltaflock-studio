-- Add external_task_id column to store taskId from n8n
ALTER TABLE generations
ADD COLUMN external_task_id TEXT;

-- Create index for efficient lookup by external_task_id
CREATE INDEX idx_generations_external_task_id 
ON generations(external_task_id);