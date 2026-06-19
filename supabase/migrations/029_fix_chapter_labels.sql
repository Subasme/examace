-- Restore real chapter names in chapters table (all subjects, both languages).
-- The import script was overwriting chapter_label from manifest.json which had
-- generic "Chapter 1", "Chapter 2" etc. labels. Run this after any import.

-- Physics
UPDATE chapters SET chapter_label = CASE (REGEXP_REPLACE(chapter_id, '[^0-9]', '', 'g'))::INT
  WHEN 1  THEN 'Electric Charges and Fields'
  WHEN 2  THEN 'Electrostatic Potential and Capacitance'
  WHEN 3  THEN 'Current Electricity'
  WHEN 4  THEN 'Moving Charges and Magnetism'
  WHEN 5  THEN 'Magnetism and Matter'
  WHEN 6  THEN 'Electromagnetic Induction'
  WHEN 7  THEN 'Alternating Current'
  WHEN 8  THEN 'Electromagnetic Waves'
  WHEN 9  THEN 'Ray Optics and Optical Instruments'
  WHEN 10 THEN 'Wave Optics'
  WHEN 11 THEN 'Dual Nature of Radiation and Matter'
  WHEN 12 THEN 'Atoms'
  WHEN 13 THEN 'Nuclei'
  WHEN 14 THEN 'Semiconductor Electronics'
END
WHERE subject = 'Physics' AND standard = '12th';

UPDATE questions SET chapter_label = CASE (REGEXP_REPLACE(chapter_id, '[^0-9]', '', 'g'))::INT
  WHEN 1  THEN 'Electric Charges and Fields'
  WHEN 2  THEN 'Electrostatic Potential and Capacitance'
  WHEN 3  THEN 'Current Electricity'
  WHEN 4  THEN 'Moving Charges and Magnetism'
  WHEN 5  THEN 'Magnetism and Matter'
  WHEN 6  THEN 'Electromagnetic Induction'
  WHEN 7  THEN 'Alternating Current'
  WHEN 8  THEN 'Electromagnetic Waves'
  WHEN 9  THEN 'Ray Optics and Optical Instruments'
  WHEN 10 THEN 'Wave Optics'
  WHEN 11 THEN 'Dual Nature of Radiation and Matter'
  WHEN 12 THEN 'Atoms'
  WHEN 13 THEN 'Nuclei'
  WHEN 14 THEN 'Semiconductor Electronics'
END
WHERE subject = 'Physics' AND standard = '12th';

-- Chemistry
UPDATE chapters SET chapter_label = CASE (REGEXP_REPLACE(chapter_id, '[^0-9]', '', 'g'))::INT
  WHEN 1  THEN 'Solutions'
  WHEN 2  THEN 'Electrochemistry'
  WHEN 3  THEN 'Chemical Kinetics'
  WHEN 4  THEN 'd and f Block Elements'
  WHEN 5  THEN 'Coordination Compounds'
  WHEN 6  THEN 'Haloalkanes and Haloarenes'
  WHEN 7  THEN 'Alcohols, Phenols and Ethers'
  WHEN 8  THEN 'Aldehydes, Ketones and Carboxylic Acids'
  WHEN 9  THEN 'Amines'
  WHEN 10 THEN 'Biomolecules'
END
WHERE subject = 'Chemistry' AND standard = '12th';

UPDATE questions SET chapter_label = CASE (REGEXP_REPLACE(chapter_id, '[^0-9]', '', 'g'))::INT
  WHEN 1  THEN 'Solutions'
  WHEN 2  THEN 'Electrochemistry'
  WHEN 3  THEN 'Chemical Kinetics'
  WHEN 4  THEN 'd and f Block Elements'
  WHEN 5  THEN 'Coordination Compounds'
  WHEN 6  THEN 'Haloalkanes and Haloarenes'
  WHEN 7  THEN 'Alcohols, Phenols and Ethers'
  WHEN 8  THEN 'Aldehydes, Ketones and Carboxylic Acids'
  WHEN 9  THEN 'Amines'
  WHEN 10 THEN 'Biomolecules'
END
WHERE subject = 'Chemistry' AND standard = '12th';

-- Biology
UPDATE chapters SET chapter_label = CASE (REGEXP_REPLACE(chapter_id, '[^0-9]', '', 'g'))::INT
  WHEN 1  THEN 'Sexual Reproduction in Flowering Plants'
  WHEN 2  THEN 'Human Reproduction'
  WHEN 3  THEN 'Reproductive Health'
  WHEN 4  THEN 'Principles of Inheritance and Variation'
  WHEN 5  THEN 'Molecular Basis of Inheritance'
  WHEN 6  THEN 'Evolution'
  WHEN 7  THEN 'Human Health and Disease'
  WHEN 8  THEN 'Microbes in Human Welfare'
  WHEN 9  THEN 'Biotechnology: Principles and Processes'
  WHEN 10 THEN 'Biotechnology and its Applications'
  WHEN 11 THEN 'Organisms and Populations'
  WHEN 12 THEN 'Ecosystem'
  WHEN 13 THEN 'Biodiversity and Conservation'
END
WHERE subject = 'Biology' AND standard = '12th';

UPDATE questions SET chapter_label = CASE (REGEXP_REPLACE(chapter_id, '[^0-9]', '', 'g'))::INT
  WHEN 1  THEN 'Sexual Reproduction in Flowering Plants'
  WHEN 2  THEN 'Human Reproduction'
  WHEN 3  THEN 'Reproductive Health'
  WHEN 4  THEN 'Principles of Inheritance and Variation'
  WHEN 5  THEN 'Molecular Basis of Inheritance'
  WHEN 6  THEN 'Evolution'
  WHEN 7  THEN 'Human Health and Disease'
  WHEN 8  THEN 'Microbes in Human Welfare'
  WHEN 9  THEN 'Biotechnology: Principles and Processes'
  WHEN 10 THEN 'Biotechnology and its Applications'
  WHEN 11 THEN 'Organisms and Populations'
  WHEN 12 THEN 'Ecosystem'
  WHEN 13 THEN 'Biodiversity and Conservation'
END
WHERE subject = 'Biology' AND standard = '12th';
