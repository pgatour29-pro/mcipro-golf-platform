-- Schema for Plutaluang Navy Golf Course tees & handicaps
-- Safe to run multiple times using upsert on unique constraint

CREATE TABLE IF NOT EXISTS course_nine (
  id SERIAL PRIMARY KEY,
  course_name TEXT NOT NULL,
  nine_name TEXT NOT NULL,
  CONSTRAINT uniq_course_nine UNIQUE(course_name, nine_name)
);

CREATE TABLE IF NOT EXISTS nine_hole (
  id SERIAL PRIMARY KEY,
  course_nine_id INTEGER NOT NULL REFERENCES course_nine(id) ON DELETE CASCADE,
  hole INTEGER NOT NULL CHECK (hole between 1 and 9),
  blue INTEGER NOT NULL,
  white INTEGER NOT NULL,
  yellow INTEGER NOT NULL,
  red INTEGER NOT NULL,
  par INTEGER NOT NULL CHECK (par in (3,4,5)),
  hcp INTEGER NOT NULL CHECK (hcp between 1 and 18),
  CONSTRAINT uniq_nine_hole UNIQUE(course_nine_id, hole)
);

INSERT INTO course_nine (course_name, nine_name) VALUES ('Plutaluang Navy Golf Course','East') ON CONFLICT DO NOTHING;
INSERT INTO course_nine (course_name, nine_name) VALUES ('Plutaluang Navy Golf Course','South') ON CONFLICT DO NOTHING;
INSERT INTO course_nine (course_name, nine_name) VALUES ('Plutaluang Navy Golf Course','West') ON CONFLICT DO NOTHING;
INSERT INTO course_nine (course_name, nine_name) VALUES ('Plutaluang Navy Golf Course','North') ON CONFLICT DO NOTHING;

INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp)
VALUES (
  (SELECT id FROM course_nine WHERE course_name='Plutaluang Navy Golf Course' AND nine_name='East'),
  1, 562, 552, 470, 419, 5, 3
)
ON CONFLICT (course_nine_id, hole) DO UPDATE SET
  blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red,
  par=EXCLUDED.par, hcp=EXCLUDED.hcp;


INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp)
VALUES (
  (SELECT id FROM course_nine WHERE course_name='Plutaluang Navy Golf Course' AND nine_name='East'),
  2, 178, 148, 137, 132, 3, 13
)
ON CONFLICT (course_nine_id, hole) DO UPDATE SET
  blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red,
  par=EXCLUDED.par, hcp=EXCLUDED.hcp;


INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp)
VALUES (
  (SELECT id FROM course_nine WHERE course_name='Plutaluang Navy Golf Course' AND nine_name='East'),
  3, 379, 349, 280, 273, 4, 11
)
ON CONFLICT (course_nine_id, hole) DO UPDATE SET
  blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red,
  par=EXCLUDED.par, hcp=EXCLUDED.hcp;


INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp)
VALUES (
  (SELECT id FROM course_nine WHERE course_name='Plutaluang Navy Golf Course' AND nine_name='East'),
  4, 425, 405, 366, 338, 4, 1
)
ON CONFLICT (course_nine_id, hole) DO UPDATE SET
  blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red,
  par=EXCLUDED.par, hcp=EXCLUDED.hcp;


INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp)
VALUES (
  (SELECT id FROM course_nine WHERE course_name='Plutaluang Navy Golf Course' AND nine_name='East'),
  5, 174, 156, 143, 123, 3, 17
)
ON CONFLICT (course_nine_id, hole) DO UPDATE SET
  blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red,
  par=EXCLUDED.par, hcp=EXCLUDED.hcp;


INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp)
VALUES (
  (SELECT id FROM course_nine WHERE course_name='Plutaluang Navy Golf Course' AND nine_name='East'),
  6, 363, 333, 316, 275, 4, 15
)
ON CONFLICT (course_nine_id, hole) DO UPDATE SET
  blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red,
  par=EXCLUDED.par, hcp=EXCLUDED.hcp;


INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp)
VALUES (
  (SELECT id FROM course_nine WHERE course_name='Plutaluang Navy Golf Course' AND nine_name='East'),
  7, 370, 335, 313, 264, 4, 7
)
ON CONFLICT (course_nine_id, hole) DO UPDATE SET
  blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red,
  par=EXCLUDED.par, hcp=EXCLUDED.hcp;


INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp)
VALUES (
  (SELECT id FROM course_nine WHERE course_name='Plutaluang Navy Golf Course' AND nine_name='East'),
  8, 422, 371, 345, 322, 4, 5
)
ON CONFLICT (course_nine_id, hole) DO UPDATE SET
  blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red,
  par=EXCLUDED.par, hcp=EXCLUDED.hcp;


INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp)
VALUES (
  (SELECT id FROM course_nine WHERE course_name='Plutaluang Navy Golf Course' AND nine_name='East'),
  9, 572, 548, 531, 479, 5, 9
)
ON CONFLICT (course_nine_id, hole) DO UPDATE SET
  blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red,
  par=EXCLUDED.par, hcp=EXCLUDED.hcp;


INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp)
VALUES (
  (SELECT id FROM course_nine WHERE course_name='Plutaluang Navy Golf Course' AND nine_name='South'),
  1, 500, 490, 480, 446, 5, 6
)
ON CONFLICT (course_nine_id, hole) DO UPDATE SET
  blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red,
  par=EXCLUDED.par, hcp=EXCLUDED.hcp;


INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp)
VALUES (
  (SELECT id FROM course_nine WHERE course_name='Plutaluang Navy Golf Course' AND nine_name='South'),
  2, 434, 374, 356, 332, 4, 8
)
ON CONFLICT (course_nine_id, hole) DO UPDATE SET
  blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red,
  par=EXCLUDED.par, hcp=EXCLUDED.hcp;


INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp)
VALUES (
  (SELECT id FROM course_nine WHERE course_name='Plutaluang Navy Golf Course' AND nine_name='South'),
  3, 470, 418, 392, 353, 4, 4
)
ON CONFLICT (course_nine_id, hole) DO UPDATE SET
  blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red,
  par=EXCLUDED.par, hcp=EXCLUDED.hcp;


INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp)
VALUES (
  (SELECT id FROM course_nine WHERE course_name='Plutaluang Navy Golf Course' AND nine_name='South'),
  4, 162, 142, 130, 110, 3, 18
)
ON CONFLICT (course_nine_id, hole) DO UPDATE SET
  blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red,
  par=EXCLUDED.par, hcp=EXCLUDED.hcp;


INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp)
VALUES (
  (SELECT id FROM course_nine WHERE course_name='Plutaluang Navy Golf Course' AND nine_name='South'),
  5, 428, 390, 359, 321, 4, 16
)
ON CONFLICT (course_nine_id, hole) DO UPDATE SET
  blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red,
  par=EXCLUDED.par, hcp=EXCLUDED.hcp;


INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp)
VALUES (
  (SELECT id FROM course_nine WHERE course_name='Plutaluang Navy Golf Course' AND nine_name='South'),
  6, 557, 507, 495, 439, 5, 2
)
ON CONFLICT (course_nine_id, hole) DO UPDATE SET
  blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red,
  par=EXCLUDED.par, hcp=EXCLUDED.hcp;


INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp)
VALUES (
  (SELECT id FROM course_nine WHERE course_name='Plutaluang Navy Golf Course' AND nine_name='South'),
  7, 225, 210, 180, 137, 3, 14
)
ON CONFLICT (course_nine_id, hole) DO UPDATE SET
  blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red,
  par=EXCLUDED.par, hcp=EXCLUDED.hcp;


INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp)
VALUES (
  (SELECT id FROM course_nine WHERE course_name='Plutaluang Navy Golf Course' AND nine_name='South'),
  8, 347, 329, 319, 314, 4, 12
)
ON CONFLICT (course_nine_id, hole) DO UPDATE SET
  blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red,
  par=EXCLUDED.par, hcp=EXCLUDED.hcp;


INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp)
VALUES (
  (SELECT id FROM course_nine WHERE course_name='Plutaluang Navy Golf Course' AND nine_name='South'),
  9, 417, 407, 387, 367, 4, 10
)
ON CONFLICT (course_nine_id, hole) DO UPDATE SET
  blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red,
  par=EXCLUDED.par, hcp=EXCLUDED.hcp;


INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp)
VALUES (
  (SELECT id FROM course_nine WHERE course_name='Plutaluang Navy Golf Course' AND nine_name='West'),
  1, 373, 367, 331, 312, 4, 13
)
ON CONFLICT (course_nine_id, hole) DO UPDATE SET
  blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red,
  par=EXCLUDED.par, hcp=EXCLUDED.hcp;


INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp)
VALUES (
  (SELECT id FROM course_nine WHERE course_name='Plutaluang Navy Golf Course' AND nine_name='West'),
  2, 539, 518, 447, 436, 5, 7
)
ON CONFLICT (course_nine_id, hole) DO UPDATE SET
  blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red,
  par=EXCLUDED.par, hcp=EXCLUDED.hcp;


INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp)
VALUES (
  (SELECT id FROM course_nine WHERE course_name='Plutaluang Navy Golf Course' AND nine_name='West'),
  3, 165, 154, 149, 141, 3, 17
)
ON CONFLICT (course_nine_id, hole) DO UPDATE SET
  blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red,
  par=EXCLUDED.par, hcp=EXCLUDED.hcp;


INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp)
VALUES (
  (SELECT id FROM course_nine WHERE course_name='Plutaluang Navy Golf Course' AND nine_name='West'),
  4, 414, 380, 365, 346, 4, 5
)
ON CONFLICT (course_nine_id, hole) DO UPDATE SET
  blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red,
  par=EXCLUDED.par, hcp=EXCLUDED.hcp;


INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp)
VALUES (
  (SELECT id FROM course_nine WHERE course_name='Plutaluang Navy Golf Course' AND nine_name='West'),
  5, 560, 545, 518, 503, 5, 3
)
ON CONFLICT (course_nine_id, hole) DO UPDATE SET
  blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red,
  par=EXCLUDED.par, hcp=EXCLUDED.hcp;


INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp)
VALUES (
  (SELECT id FROM course_nine WHERE course_name='Plutaluang Navy Golf Course' AND nine_name='West'),
  6, 404, 382, 314, 283, 4, 11
)
ON CONFLICT (course_nine_id, hole) DO UPDATE SET
  blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red,
  par=EXCLUDED.par, hcp=EXCLUDED.hcp;


INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp)
VALUES (
  (SELECT id FROM course_nine WHERE course_name='Plutaluang Navy Golf Course' AND nine_name='West'),
  7, 454, 434, 387, 357, 4, 1
)
ON CONFLICT (course_nine_id, hole) DO UPDATE SET
  blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red,
  par=EXCLUDED.par, hcp=EXCLUDED.hcp;


INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp)
VALUES (
  (SELECT id FROM course_nine WHERE course_name='Plutaluang Navy Golf Course' AND nine_name='West'),
  8, 172, 155, 142, 128, 3, 15
)
ON CONFLICT (course_nine_id, hole) DO UPDATE SET
  blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red,
  par=EXCLUDED.par, hcp=EXCLUDED.hcp;


INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp)
VALUES (
  (SELECT id FROM course_nine WHERE course_name='Plutaluang Navy Golf Course' AND nine_name='West'),
  9, 408, 395, 364, 358, 4, 9
)
ON CONFLICT (course_nine_id, hole) DO UPDATE SET
  blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red,
  par=EXCLUDED.par, hcp=EXCLUDED.hcp;


INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp)
VALUES (
  (SELECT id FROM course_nine WHERE course_name='Plutaluang Navy Golf Course' AND nine_name='North'),
  1, 381, 361, 376, 338, 4, 6
)
ON CONFLICT (course_nine_id, hole) DO UPDATE SET
  blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red,
  par=EXCLUDED.par, hcp=EXCLUDED.hcp;


INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp)
VALUES (
  (SELECT id FROM course_nine WHERE course_name='Plutaluang Navy Golf Course' AND nine_name='North'),
  2, 520, 484, 468, 395, 5, 12
)
ON CONFLICT (course_nine_id, hole) DO UPDATE SET
  blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red,
  par=EXCLUDED.par, hcp=EXCLUDED.hcp;


INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp)
VALUES (
  (SELECT id FROM course_nine WHERE course_name='Plutaluang Navy Golf Course' AND nine_name='North'),
  3, 173, 153, 125, 110, 3, 16
)
ON CONFLICT (course_nine_id, hole) DO UPDATE SET
  blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red,
  par=EXCLUDED.par, hcp=EXCLUDED.hcp;


INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp)
VALUES (
  (SELECT id FROM course_nine WHERE course_name='Plutaluang Navy Golf Course' AND nine_name='North'),
  4, 600, 563, 559, 489, 5, 8
)
ON CONFLICT (course_nine_id, hole) DO UPDATE SET
  blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red,
  par=EXCLUDED.par, hcp=EXCLUDED.hcp;


INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp)
VALUES (
  (SELECT id FROM course_nine WHERE course_name='Plutaluang Navy Golf Course' AND nine_name='North'),
  5, 420, 400, 367, 333, 4, 4
)
ON CONFLICT (course_nine_id, hole) DO UPDATE SET
  blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red,
  par=EXCLUDED.par, hcp=EXCLUDED.hcp;


INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp)
VALUES (
  (SELECT id FROM course_nine WHERE course_name='Plutaluang Navy Golf Course' AND nine_name='North'),
  6, 175, 160, 144, 129, 3, 18
)
ON CONFLICT (course_nine_id, hole) DO UPDATE SET
  blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red,
  par=EXCLUDED.par, hcp=EXCLUDED.hcp;


INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp)
VALUES (
  (SELECT id FROM course_nine WHERE course_name='Plutaluang Navy Golf Course' AND nine_name='North'),
  7, 410, 390, 367, 325, 4, 14
)
ON CONFLICT (course_nine_id, hole) DO UPDATE SET
  blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red,
  par=EXCLUDED.par, hcp=EXCLUDED.hcp;


INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp)
VALUES (
  (SELECT id FROM course_nine WHERE course_name='Plutaluang Navy Golf Course' AND nine_name='North'),
  8, 430, 410, 346, 343, 4, 2
)
ON CONFLICT (course_nine_id, hole) DO UPDATE SET
  blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red,
  par=EXCLUDED.par, hcp=EXCLUDED.hcp;


INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp)
VALUES (
  (SELECT id FROM course_nine WHERE course_name='Plutaluang Navy Golf Course' AND nine_name='North'),
  9, 391, 381, 312, 301, 4, 10
)
ON CONFLICT (course_nine_id, hole) DO UPDATE SET
  blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red,
  par=EXCLUDED.par, hcp=EXCLUDED.hcp;
