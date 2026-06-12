-- Standalone: update chapter labels to real NCERT names
-- Run this in Supabase SQL Editor
-- Safe to run multiple times

-- ── Physics (14 chapters) ────────────────────────────────────────────────────
UPDATE chapters SET chapter_label='Electric Charges and Fields'            WHERE subject='Physics' AND chapter_id='chapter1';
UPDATE chapters SET chapter_label='Electrostatic Potential and Capacitance' WHERE subject='Physics' AND chapter_id='chapter2';
UPDATE chapters SET chapter_label='Current Electricity'                    WHERE subject='Physics' AND chapter_id='chapter3';
UPDATE chapters SET chapter_label='Moving Charges and Magnetism'           WHERE subject='Physics' AND chapter_id='chapter4';
UPDATE chapters SET chapter_label='Magnetism and Matter'                   WHERE subject='Physics' AND chapter_id='chapter5';
UPDATE chapters SET chapter_label='Electromagnetic Induction'              WHERE subject='Physics' AND chapter_id='chapter6';
UPDATE chapters SET chapter_label='Alternating Current'                    WHERE subject='Physics' AND chapter_id='chapter7';
UPDATE chapters SET chapter_label='Electromagnetic Waves'                  WHERE subject='Physics' AND chapter_id='chapter8';
UPDATE chapters SET chapter_label='Ray Optics and Optical Instruments'     WHERE subject='Physics' AND chapter_id='chapter9';
UPDATE chapters SET chapter_label='Wave Optics'                            WHERE subject='Physics' AND chapter_id='chapter10';
UPDATE chapters SET chapter_label='Dual Nature of Radiation and Matter'    WHERE subject='Physics' AND chapter_id='chapter11';
UPDATE chapters SET chapter_label='Atoms'                                  WHERE subject='Physics' AND chapter_id='chapter12';
UPDATE chapters SET chapter_label='Nuclei'                                 WHERE subject='Physics' AND chapter_id='chapter13';
UPDATE chapters SET chapter_label='Semiconductor Electronics'              WHERE subject='Physics' AND chapter_id='chapter14';

-- ── Chemistry (10 chapters) ──────────────────────────────────────────────────
UPDATE chapters SET chapter_label='Solutions'                               WHERE subject='Chemistry' AND chapter_id='chapter1';
UPDATE chapters SET chapter_label='Electrochemistry'                        WHERE subject='Chemistry' AND chapter_id='chapter2';
UPDATE chapters SET chapter_label='Chemical Kinetics'                       WHERE subject='Chemistry' AND chapter_id='chapter3';
UPDATE chapters SET chapter_label='d and f Block Elements'                  WHERE subject='Chemistry' AND chapter_id='chapter4';
UPDATE chapters SET chapter_label='Coordination Compounds'                  WHERE subject='Chemistry' AND chapter_id='chapter5';
UPDATE chapters SET chapter_label='Haloalkanes and Haloarenes'              WHERE subject='Chemistry' AND chapter_id='chapter6';
UPDATE chapters SET chapter_label='Alcohols, Phenols and Ethers'            WHERE subject='Chemistry' AND chapter_id='chapter7';
UPDATE chapters SET chapter_label='Aldehydes, Ketones and Carboxylic Acids' WHERE subject='Chemistry' AND chapter_id='chapter8';
UPDATE chapters SET chapter_label='Amines'                                  WHERE subject='Chemistry' AND chapter_id='chapter9';
UPDATE chapters SET chapter_label='Biomolecules'                            WHERE subject='Chemistry' AND chapter_id='chapter10';

-- ── Biology (13 chapters) ────────────────────────────────────────────────────
UPDATE chapters SET chapter_label='Sexual Reproduction in Flowering Plants' WHERE subject='Biology' AND chapter_id='chapter1';
UPDATE chapters SET chapter_label='Human Reproduction'                      WHERE subject='Biology' AND chapter_id='chapter2';
UPDATE chapters SET chapter_label='Reproductive Health'                     WHERE subject='Biology' AND chapter_id='chapter3';
UPDATE chapters SET chapter_label='Principles of Inheritance and Variation' WHERE subject='Biology' AND chapter_id='chapter4';
UPDATE chapters SET chapter_label='Molecular Basis of Inheritance'          WHERE subject='Biology' AND chapter_id='chapter5';
UPDATE chapters SET chapter_label='Evolution'                               WHERE subject='Biology' AND chapter_id='chapter6';
UPDATE chapters SET chapter_label='Human Health and Disease'                WHERE subject='Biology' AND chapter_id='chapter7';
UPDATE chapters SET chapter_label='Microbes in Human Welfare'               WHERE subject='Biology' AND chapter_id='chapter8';
UPDATE chapters SET chapter_label='Biotechnology: Principles and Processes' WHERE subject='Biology' AND chapter_id='chapter9';
UPDATE chapters SET chapter_label='Biotechnology and its Applications'      WHERE subject='Biology' AND chapter_id='chapter10';
UPDATE chapters SET chapter_label='Organisms and Populations'               WHERE subject='Biology' AND chapter_id='chapter11';
UPDATE chapters SET chapter_label='Ecosystem'                               WHERE subject='Biology' AND chapter_id='chapter12';
UPDATE chapters SET chapter_label='Biodiversity and Conservation'           WHERE subject='Biology' AND chapter_id='chapter13';

-- Also update chapter_label in the questions table to match
UPDATE questions SET chapter_label='Electric Charges and Fields'            WHERE subject='Physics' AND chapter_id='chapter1';
UPDATE questions SET chapter_label='Electrostatic Potential and Capacitance' WHERE subject='Physics' AND chapter_id='chapter2';
UPDATE questions SET chapter_label='Current Electricity'                    WHERE subject='Physics' AND chapter_id='chapter3';
UPDATE questions SET chapter_label='Moving Charges and Magnetism'           WHERE subject='Physics' AND chapter_id='chapter4';
UPDATE questions SET chapter_label='Magnetism and Matter'                   WHERE subject='Physics' AND chapter_id='chapter5';
UPDATE questions SET chapter_label='Electromagnetic Induction'              WHERE subject='Physics' AND chapter_id='chapter6';
