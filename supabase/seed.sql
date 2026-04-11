-- Seed categories based on PhilNITS FE exam structure
-- Weights approximate the real exam question distribution

INSERT INTO public.categories (name, display_name, exam_weight) VALUES
  ('technology', 'Technology', 0.15),
  ('management', 'Management', 0.10),
  ('strategy', 'Strategy', 0.10),
  ('hardware', 'Hardware', 0.08),
  ('software', 'Software', 0.10),
  ('database', 'Database', 0.08),
  ('networking', 'Networking', 0.08),
  ('security', 'Security', 0.06),
  ('algorithms', 'Algorithms & Data Structures', 0.10),
  ('system-development', 'System Development', 0.08),
  ('project-management', 'Project Management', 0.07)
ON CONFLICT (name) DO NOTHING;
