-- Add rating column to generations table
ALTER TABLE generations 
ADD COLUMN rating integer 
CHECK (rating >= 1 AND rating <= 5);