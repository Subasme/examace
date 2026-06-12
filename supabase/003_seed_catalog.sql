-- Complete chapter catalog — Class 12, English + Tamil
-- Run AFTER 001_initial_schema.sql and 002_rls_policies.sql
-- question_count values are updated automatically by the app; set 0 here for fresh installs.

INSERT INTO chapters (language,standard,subject,chapter_id,chapter_label,question_count) VALUES

-- Physics (14 chapters)
('English','12th','Physics','chapter1', 'Electric Charges and Fields',              456),
('English','12th','Physics','chapter2', 'Electrostatic Potential and Capacitance',  347),
('English','12th','Physics','chapter3', 'Current Electricity',                      244),
('English','12th','Physics','chapter4', 'Moving Charges and Magnetism',             384),
('English','12th','Physics','chapter5', 'Magnetism and Matter',                     213),
('English','12th','Physics','chapter6', 'Electromagnetic Induction',                249),
('English','12th','Physics','chapter7', 'Alternating Current',                        0),
('English','12th','Physics','chapter8', 'Electromagnetic Waves',                      0),
('English','12th','Physics','chapter9', 'Ray Optics and Optical Instruments',         0),
('English','12th','Physics','chapter10','Wave Optics',                                0),
('English','12th','Physics','chapter11','Dual Nature of Radiation and Matter',        0),
('English','12th','Physics','chapter12','Atoms',                                      0),
('English','12th','Physics','chapter13','Nuclei',                                     0),
('English','12th','Physics','chapter14','Semiconductor Electronics',                  0),

-- Chemistry (10 chapters)
('English','12th','Chemistry','chapter1', 'Solutions',                               0),
('English','12th','Chemistry','chapter2', 'Electrochemistry',                        0),
('English','12th','Chemistry','chapter3', 'Chemical Kinetics',                       0),
('English','12th','Chemistry','chapter4', 'd and f Block Elements',                  0),
('English','12th','Chemistry','chapter5', 'Coordination Compounds',                  0),
('English','12th','Chemistry','chapter6', 'Haloalkanes and Haloarenes',              0),
('English','12th','Chemistry','chapter7', 'Alcohols, Phenols and Ethers',            0),
('English','12th','Chemistry','chapter8', 'Aldehydes, Ketones and Carboxylic Acids', 0),
('English','12th','Chemistry','chapter9', 'Amines',                                  0),
('English','12th','Chemistry','chapter10','Biomolecules',                            0),

-- Biology (13 chapters)
('English','12th','Biology','chapter1', 'Sexual Reproduction in Flowering Plants',   0),
('English','12th','Biology','chapter2', 'Human Reproduction',                        0),
('English','12th','Biology','chapter3', 'Reproductive Health',                       0),
('English','12th','Biology','chapter4', 'Principles of Inheritance and Variation',   0),
('English','12th','Biology','chapter5', 'Molecular Basis of Inheritance',            0),
('English','12th','Biology','chapter6', 'Evolution',                                 0),
('English','12th','Biology','chapter7', 'Human Health and Disease',                  0),
('English','12th','Biology','chapter8', 'Microbes in Human Welfare',                 0),
('English','12th','Biology','chapter9', 'Biotechnology: Principles and Processes',   0),
('English','12th','Biology','chapter10','Biotechnology and its Applications',        0),
('English','12th','Biology','chapter11','Organisms and Populations',                 0),
('English','12th','Biology','chapter12','Ecosystem',                                 0),
('English','12th','Biology','chapter13','Biodiversity and Conservation',             0),

-- Tamil medium — same chapter ids and labels
('Tamil','12th','Physics','chapter1', 'Electric Charges and Fields',              456),
('Tamil','12th','Physics','chapter2', 'Electrostatic Potential and Capacitance',  345),
('Tamil','12th','Physics','chapter3', 'Current Electricity',                      244),
('Tamil','12th','Physics','chapter4', 'Moving Charges and Magnetism',             384),
('Tamil','12th','Physics','chapter5', 'Magnetism and Matter',                     213),
('Tamil','12th','Physics','chapter6', 'Electromagnetic Induction',                249),
('Tamil','12th','Physics','chapter7', 'Alternating Current',                        0),
('Tamil','12th','Physics','chapter8', 'Electromagnetic Waves',                      0),
('Tamil','12th','Physics','chapter9', 'Ray Optics and Optical Instruments',         0),
('Tamil','12th','Physics','chapter10','Wave Optics',                                0),
('Tamil','12th','Physics','chapter11','Dual Nature of Radiation and Matter',        0),
('Tamil','12th','Physics','chapter12','Atoms',                                      0),
('Tamil','12th','Physics','chapter13','Nuclei',                                     0),
('Tamil','12th','Physics','chapter14','Semiconductor Electronics',                  0),

('Tamil','12th','Chemistry','chapter1', 'Solutions',                               0),
('Tamil','12th','Chemistry','chapter2', 'Electrochemistry',                        0),
('Tamil','12th','Chemistry','chapter3', 'Chemical Kinetics',                       0),
('Tamil','12th','Chemistry','chapter4', 'd and f Block Elements',                  0),
('Tamil','12th','Chemistry','chapter5', 'Coordination Compounds',                  0),
('Tamil','12th','Chemistry','chapter6', 'Haloalkanes and Haloarenes',              0),
('Tamil','12th','Chemistry','chapter7', 'Alcohols, Phenols and Ethers',            0),
('Tamil','12th','Chemistry','chapter8', 'Aldehydes, Ketones and Carboxylic Acids', 0),
('Tamil','12th','Chemistry','chapter9', 'Amines',                                  0),
('Tamil','12th','Chemistry','chapter10','Biomolecules',                            0),

('Tamil','12th','Biology','chapter1', 'Sexual Reproduction in Flowering Plants',   0),
('Tamil','12th','Biology','chapter2', 'Human Reproduction',                        0),
('Tamil','12th','Biology','chapter3', 'Reproductive Health',                       0),
('Tamil','12th','Biology','chapter4', 'Principles of Inheritance and Variation',   0),
('Tamil','12th','Biology','chapter5', 'Molecular Basis of Inheritance',            0),
('Tamil','12th','Biology','chapter6', 'Evolution',                                 0),
('Tamil','12th','Biology','chapter7', 'Human Health and Disease',                  0),
('Tamil','12th','Biology','chapter8', 'Microbes in Human Welfare',                 0),
('Tamil','12th','Biology','chapter9', 'Biotechnology: Principles and Processes',   0),
('Tamil','12th','Biology','chapter10','Biotechnology and its Applications',        0),
('Tamil','12th','Biology','chapter11','Organisms and Populations',                 0),
('Tamil','12th','Biology','chapter12','Ecosystem',                                 0),
('Tamil','12th','Biology','chapter13','Biodiversity and Conservation',             0)

ON CONFLICT (language,standard,subject,chapter_id) DO UPDATE
  SET chapter_label=EXCLUDED.chapter_label,
      question_count=EXCLUDED.question_count;
