-- =====================================================================
-- Pattaya course corrections + additions — 2026-07-28
-- Source: pattayagolfcourses.com scorecards (Pete-directed).
-- NOT touched: phoenix_* (hand-corrected from physical card; site
-- disagrees on Mountain/Lake SI + Lakes h5/h6 par — flagged to Pete),
-- Burapha B-Belfry Ladies/red column (site row provably corrupted),
-- plantation per-nine SI (site's own combo columns agree with DB).
-- =====================================================================
BEGIN;

-- siam_cc_old
UPDATE course_holes SET yardage=543 WHERE course_id='siam_cc_old' AND tee_marker='black' AND hole_number=1;
UPDATE course_holes SET yardage=373 WHERE course_id='siam_cc_old' AND tee_marker='black' AND hole_number=2;
UPDATE course_holes SET yardage=449 WHERE course_id='siam_cc_old' AND tee_marker='black' AND hole_number=3;
UPDATE course_holes SET yardage=189 WHERE course_id='siam_cc_old' AND tee_marker='black' AND hole_number=4;
UPDATE course_holes SET yardage=402 WHERE course_id='siam_cc_old' AND tee_marker='black' AND hole_number=5;
UPDATE course_holes SET yardage=423 WHERE course_id='siam_cc_old' AND tee_marker='black' AND hole_number=6;
UPDATE course_holes SET yardage=557 WHERE course_id='siam_cc_old' AND tee_marker='black' AND hole_number=7;
UPDATE course_holes SET yardage=220 WHERE course_id='siam_cc_old' AND tee_marker='black' AND hole_number=8;
UPDATE course_holes SET yardage=422 WHERE course_id='siam_cc_old' AND tee_marker='black' AND hole_number=9;
UPDATE course_holes SET yardage=578 WHERE course_id='siam_cc_old' AND tee_marker='black' AND hole_number=10;
UPDATE course_holes SET yardage=450 WHERE course_id='siam_cc_old' AND tee_marker='black' AND hole_number=11;
UPDATE course_holes SET yardage=188 WHERE course_id='siam_cc_old' AND tee_marker='black' AND hole_number=12;
UPDATE course_holes SET yardage=359 WHERE course_id='siam_cc_old' AND tee_marker='black' AND hole_number=13;
UPDATE course_holes SET yardage=418 WHERE course_id='siam_cc_old' AND tee_marker='black' AND hole_number=14;
UPDATE course_holes SET yardage=424 WHERE course_id='siam_cc_old' AND tee_marker='black' AND hole_number=15;
UPDATE course_holes SET yardage=231 WHERE course_id='siam_cc_old' AND tee_marker='black' AND hole_number=16;
UPDATE course_holes SET yardage=396 WHERE course_id='siam_cc_old' AND tee_marker='black' AND hole_number=17;
UPDATE course_holes SET yardage=540 WHERE course_id='siam_cc_old' AND tee_marker='black' AND hole_number=18;
UPDATE course_holes SET yardage=506 WHERE course_id='siam_cc_old' AND tee_marker='blue' AND hole_number=1;
UPDATE course_holes SET yardage=327 WHERE course_id='siam_cc_old' AND tee_marker='blue' AND hole_number=2;
UPDATE course_holes SET yardage=413 WHERE course_id='siam_cc_old' AND tee_marker='blue' AND hole_number=3;
UPDATE course_holes SET yardage=173 WHERE course_id='siam_cc_old' AND tee_marker='blue' AND hole_number=4;
UPDATE course_holes SET yardage=370 WHERE course_id='siam_cc_old' AND tee_marker='blue' AND hole_number=5;
UPDATE course_holes SET yardage=387 WHERE course_id='siam_cc_old' AND tee_marker='blue' AND hole_number=6;
UPDATE course_holes SET yardage=520 WHERE course_id='siam_cc_old' AND tee_marker='blue' AND hole_number=7;
UPDATE course_holes SET yardage=191 WHERE course_id='siam_cc_old' AND tee_marker='blue' AND hole_number=8;
UPDATE course_holes SET yardage=391 WHERE course_id='siam_cc_old' AND tee_marker='blue' AND hole_number=9;
UPDATE course_holes SET yardage=536 WHERE course_id='siam_cc_old' AND tee_marker='blue' AND hole_number=10;
UPDATE course_holes SET yardage=424 WHERE course_id='siam_cc_old' AND tee_marker='blue' AND hole_number=11;
UPDATE course_holes SET yardage=161 WHERE course_id='siam_cc_old' AND tee_marker='blue' AND hole_number=12;
UPDATE course_holes SET yardage=327 WHERE course_id='siam_cc_old' AND tee_marker='blue' AND hole_number=13;
UPDATE course_holes SET yardage=381 WHERE course_id='siam_cc_old' AND tee_marker='blue' AND hole_number=14;
UPDATE course_holes SET yardage=386 WHERE course_id='siam_cc_old' AND tee_marker='blue' AND hole_number=15;
UPDATE course_holes SET yardage=212 WHERE course_id='siam_cc_old' AND tee_marker='blue' AND hole_number=16;
UPDATE course_holes SET yardage=369 WHERE course_id='siam_cc_old' AND tee_marker='blue' AND hole_number=17;
UPDATE course_holes SET yardage=479 WHERE course_id='siam_cc_old' AND tee_marker='blue' AND hole_number=18;
UPDATE course_holes SET yardage=475 WHERE course_id='siam_cc_old' AND tee_marker='white' AND hole_number=1;
UPDATE course_holes SET yardage=274 WHERE course_id='siam_cc_old' AND tee_marker='white' AND hole_number=2;
UPDATE course_holes SET yardage=380 WHERE course_id='siam_cc_old' AND tee_marker='white' AND hole_number=3;
UPDATE course_holes SET yardage=148 WHERE course_id='siam_cc_old' AND tee_marker='white' AND hole_number=4;
UPDATE course_holes SET yardage=363 WHERE course_id='siam_cc_old' AND tee_marker='white' AND hole_number=5;
UPDATE course_holes SET yardage=350 WHERE course_id='siam_cc_old' AND tee_marker='white' AND hole_number=6;
UPDATE course_holes SET yardage=466 WHERE course_id='siam_cc_old' AND tee_marker='white' AND hole_number=7;
UPDATE course_holes SET yardage=168 WHERE course_id='siam_cc_old' AND tee_marker='white' AND hole_number=8;
UPDATE course_holes SET yardage=328 WHERE course_id='siam_cc_old' AND tee_marker='white' AND hole_number=9;
UPDATE course_holes SET yardage=505 WHERE course_id='siam_cc_old' AND tee_marker='white' AND hole_number=10;
UPDATE course_holes SET yardage=372 WHERE course_id='siam_cc_old' AND tee_marker='white' AND hole_number=11;
UPDATE course_holes SET yardage=154 WHERE course_id='siam_cc_old' AND tee_marker='white' AND hole_number=12;
UPDATE course_holes SET yardage=302 WHERE course_id='siam_cc_old' AND tee_marker='white' AND hole_number=13;
UPDATE course_holes SET yardage=372 WHERE course_id='siam_cc_old' AND tee_marker='white' AND hole_number=14;
UPDATE course_holes SET yardage=374 WHERE course_id='siam_cc_old' AND tee_marker='white' AND hole_number=15;
UPDATE course_holes SET yardage=186 WHERE course_id='siam_cc_old' AND tee_marker='white' AND hole_number=16;
UPDATE course_holes SET yardage=344 WHERE course_id='siam_cc_old' AND tee_marker='white' AND hole_number=17;
UPDATE course_holes SET yardage=445 WHERE course_id='siam_cc_old' AND tee_marker='white' AND hole_number=18;
UPDATE course_holes SET yardage=443 WHERE course_id='siam_cc_old' AND tee_marker='red' AND hole_number=1;
UPDATE course_holes SET yardage=233 WHERE course_id='siam_cc_old' AND tee_marker='red' AND hole_number=2;
UPDATE course_holes SET yardage=357 WHERE course_id='siam_cc_old' AND tee_marker='red' AND hole_number=3;
UPDATE course_holes SET yardage=112 WHERE course_id='siam_cc_old' AND tee_marker='red' AND hole_number=4;
UPDATE course_holes SET yardage=328 WHERE course_id='siam_cc_old' AND tee_marker='red' AND hole_number=5;
UPDATE course_holes SET yardage=302 WHERE course_id='siam_cc_old' AND tee_marker='red' AND hole_number=6;
UPDATE course_holes SET yardage=424 WHERE course_id='siam_cc_old' AND tee_marker='red' AND hole_number=7;
UPDATE course_holes SET yardage=146 WHERE course_id='siam_cc_old' AND tee_marker='red' AND hole_number=8;
UPDATE course_holes SET yardage=297 WHERE course_id='siam_cc_old' AND tee_marker='red' AND hole_number=9;
UPDATE course_holes SET yardage=445 WHERE course_id='siam_cc_old' AND tee_marker='red' AND hole_number=10;
UPDATE course_holes SET yardage=274 WHERE course_id='siam_cc_old' AND tee_marker='red' AND hole_number=11;
UPDATE course_holes SET yardage=133 WHERE course_id='siam_cc_old' AND tee_marker='red' AND hole_number=12;
UPDATE course_holes SET yardage=276 WHERE course_id='siam_cc_old' AND tee_marker='red' AND hole_number=13;
UPDATE course_holes SET yardage=331 WHERE course_id='siam_cc_old' AND tee_marker='red' AND hole_number=14;
UPDATE course_holes SET yardage=316 WHERE course_id='siam_cc_old' AND tee_marker='red' AND hole_number=15;
UPDATE course_holes SET yardage=129 WHERE course_id='siam_cc_old' AND tee_marker='red' AND hole_number=16;
UPDATE course_holes SET yardage=318 WHERE course_id='siam_cc_old' AND tee_marker='red' AND hole_number=17;
UPDATE course_holes SET yardage=414 WHERE course_id='siam_cc_old' AND tee_marker='red' AND hole_number=18;

-- siam_rolling_hills
UPDATE course_holes SET yardage=368 WHERE course_id='siam_rolling_hills' AND tee_marker='black' AND hole_number=1;
UPDATE course_holes SET yardage=229 WHERE course_id='siam_rolling_hills' AND tee_marker='black' AND hole_number=2;
UPDATE course_holes SET yardage=426 WHERE course_id='siam_rolling_hills' AND tee_marker='black' AND hole_number=3;
UPDATE course_holes SET yardage=573 WHERE course_id='siam_rolling_hills' AND tee_marker='black' AND hole_number=4;
UPDATE course_holes SET yardage=322 WHERE course_id='siam_rolling_hills' AND tee_marker='black' AND hole_number=5;
UPDATE course_holes SET yardage=546 WHERE course_id='siam_rolling_hills' AND tee_marker='black' AND hole_number=6;
UPDATE course_holes SET yardage=186 WHERE course_id='siam_rolling_hills' AND tee_marker='black' AND hole_number=7;
UPDATE course_holes SET yardage=434 WHERE course_id='siam_rolling_hills' AND tee_marker='black' AND hole_number=8;
UPDATE course_holes SET yardage=380 WHERE course_id='siam_rolling_hills' AND tee_marker='black' AND hole_number=9;
UPDATE course_holes SET yardage=390 WHERE course_id='siam_rolling_hills' AND tee_marker='black' AND hole_number=10;
UPDATE course_holes SET yardage=592 WHERE course_id='siam_rolling_hills' AND tee_marker='black' AND hole_number=11;
UPDATE course_holes SET yardage=500 WHERE course_id='siam_rolling_hills' AND tee_marker='black' AND hole_number=12;
UPDATE course_holes SET yardage=236 WHERE course_id='siam_rolling_hills' AND tee_marker='black' AND hole_number=13;
UPDATE course_holes SET yardage=481 WHERE course_id='siam_rolling_hills' AND tee_marker='black' AND hole_number=14;
UPDATE course_holes SET yardage=619 WHERE course_id='siam_rolling_hills' AND tee_marker='black' AND hole_number=15;
UPDATE course_holes SET yardage=174 WHERE course_id='siam_rolling_hills' AND tee_marker='black' AND hole_number=16;
UPDATE course_holes SET yardage=354 WHERE course_id='siam_rolling_hills' AND tee_marker='black' AND hole_number=17;
UPDATE course_holes SET yardage=441 WHERE course_id='siam_rolling_hills' AND tee_marker='black' AND hole_number=18;
UPDATE course_holes SET yardage=337 WHERE course_id='siam_rolling_hills' AND tee_marker='blue' AND hole_number=1;
UPDATE course_holes SET yardage=207 WHERE course_id='siam_rolling_hills' AND tee_marker='blue' AND hole_number=2;
UPDATE course_holes SET yardage=400 WHERE course_id='siam_rolling_hills' AND tee_marker='blue' AND hole_number=3;
UPDATE course_holes SET yardage=533 WHERE course_id='siam_rolling_hills' AND tee_marker='blue' AND hole_number=4;
UPDATE course_holes SET yardage=303 WHERE course_id='siam_rolling_hills' AND tee_marker='blue' AND hole_number=5;
UPDATE course_holes SET yardage=524 WHERE course_id='siam_rolling_hills' AND tee_marker='blue' AND hole_number=6;
UPDATE course_holes SET yardage=154 WHERE course_id='siam_rolling_hills' AND tee_marker='blue' AND hole_number=7;
UPDATE course_holes SET yardage=405 WHERE course_id='siam_rolling_hills' AND tee_marker='blue' AND hole_number=8;
UPDATE course_holes SET yardage=358 WHERE course_id='siam_rolling_hills' AND tee_marker='blue' AND hole_number=9;
UPDATE course_holes SET yardage=364 WHERE course_id='siam_rolling_hills' AND tee_marker='blue' AND hole_number=10;
UPDATE course_holes SET yardage=536 WHERE course_id='siam_rolling_hills' AND tee_marker='blue' AND hole_number=11;
UPDATE course_holes SET yardage=462 WHERE course_id='siam_rolling_hills' AND tee_marker='blue' AND hole_number=12;
UPDATE course_holes SET yardage=199 WHERE course_id='siam_rolling_hills' AND tee_marker='blue' AND hole_number=13;
UPDATE course_holes SET yardage=450 WHERE course_id='siam_rolling_hills' AND tee_marker='blue' AND hole_number=14;
UPDATE course_holes SET yardage=576 WHERE course_id='siam_rolling_hills' AND tee_marker='blue' AND hole_number=15;
UPDATE course_holes SET yardage=159 WHERE course_id='siam_rolling_hills' AND tee_marker='blue' AND hole_number=16;
UPDATE course_holes SET yardage=321 WHERE course_id='siam_rolling_hills' AND tee_marker='blue' AND hole_number=17;
UPDATE course_holes SET yardage=409 WHERE course_id='siam_rolling_hills' AND tee_marker='blue' AND hole_number=18;
UPDATE course_holes SET yardage=322 WHERE course_id='siam_rolling_hills' AND tee_marker='white' AND hole_number=1;
UPDATE course_holes SET yardage=180 WHERE course_id='siam_rolling_hills' AND tee_marker='white' AND hole_number=2;
UPDATE course_holes SET yardage=373 WHERE course_id='siam_rolling_hills' AND tee_marker='white' AND hole_number=3;
UPDATE course_holes SET yardage=478 WHERE course_id='siam_rolling_hills' AND tee_marker='white' AND hole_number=4;
UPDATE course_holes SET yardage=280 WHERE course_id='siam_rolling_hills' AND tee_marker='white' AND hole_number=5;
UPDATE course_holes SET yardage=492 WHERE course_id='siam_rolling_hills' AND tee_marker='white' AND hole_number=6;
UPDATE course_holes SET yardage=125 WHERE course_id='siam_rolling_hills' AND tee_marker='white' AND hole_number=7;
UPDATE course_holes SET yardage=379 WHERE course_id='siam_rolling_hills' AND tee_marker='white' AND hole_number=8;
UPDATE course_holes SET yardage=334 WHERE course_id='siam_rolling_hills' AND tee_marker='white' AND hole_number=9;
UPDATE course_holes SET yardage=315 WHERE course_id='siam_rolling_hills' AND tee_marker='white' AND hole_number=10;
UPDATE course_holes SET yardage=502 WHERE course_id='siam_rolling_hills' AND tee_marker='white' AND hole_number=11;
UPDATE course_holes SET yardage=403 WHERE course_id='siam_rolling_hills' AND tee_marker='white' AND hole_number=12;
UPDATE course_holes SET yardage=166 WHERE course_id='siam_rolling_hills' AND tee_marker='white' AND hole_number=13;
UPDATE course_holes SET yardage=421 WHERE course_id='siam_rolling_hills' AND tee_marker='white' AND hole_number=14;
UPDATE course_holes SET yardage=536 WHERE course_id='siam_rolling_hills' AND tee_marker='white' AND hole_number=15;
UPDATE course_holes SET yardage=132 WHERE course_id='siam_rolling_hills' AND tee_marker='white' AND hole_number=16;
UPDATE course_holes SET yardage=292 WHERE course_id='siam_rolling_hills' AND tee_marker='white' AND hole_number=17;
UPDATE course_holes SET yardage=366 WHERE course_id='siam_rolling_hills' AND tee_marker='white' AND hole_number=18;
UPDATE course_holes SET yardage=301 WHERE course_id='siam_rolling_hills' AND tee_marker='red' AND hole_number=1;
UPDATE course_holes SET yardage=151 WHERE course_id='siam_rolling_hills' AND tee_marker='red' AND hole_number=2;
UPDATE course_holes SET yardage=344 WHERE course_id='siam_rolling_hills' AND tee_marker='red' AND hole_number=3;
UPDATE course_holes SET yardage=410 WHERE course_id='siam_rolling_hills' AND tee_marker='red' AND hole_number=4;
UPDATE course_holes SET yardage=257 WHERE course_id='siam_rolling_hills' AND tee_marker='red' AND hole_number=5;
UPDATE course_holes SET yardage=457 WHERE course_id='siam_rolling_hills' AND tee_marker='red' AND hole_number=6;
UPDATE course_holes SET yardage=99 WHERE course_id='siam_rolling_hills' AND tee_marker='red' AND hole_number=7;
UPDATE course_holes SET yardage=358 WHERE course_id='siam_rolling_hills' AND tee_marker='red' AND hole_number=8;
UPDATE course_holes SET yardage=300 WHERE course_id='siam_rolling_hills' AND tee_marker='red' AND hole_number=9;
UPDATE course_holes SET yardage=278 WHERE course_id='siam_rolling_hills' AND tee_marker='red' AND hole_number=10;
UPDATE course_holes SET yardage=468 WHERE course_id='siam_rolling_hills' AND tee_marker='red' AND hole_number=11;
UPDATE course_holes SET yardage=364 WHERE course_id='siam_rolling_hills' AND tee_marker='red' AND hole_number=12;
UPDATE course_holes SET yardage=142 WHERE course_id='siam_rolling_hills' AND tee_marker='red' AND hole_number=13;
UPDATE course_holes SET yardage=373 WHERE course_id='siam_rolling_hills' AND tee_marker='red' AND hole_number=14;
UPDATE course_holes SET yardage=491 WHERE course_id='siam_rolling_hills' AND tee_marker='red' AND hole_number=15;
UPDATE course_holes SET yardage=102 WHERE course_id='siam_rolling_hills' AND tee_marker='red' AND hole_number=16;
UPDATE course_holes SET yardage=268 WHERE course_id='siam_rolling_hills' AND tee_marker='red' AND hole_number=17;
UPDATE course_holes SET yardage=326 WHERE course_id='siam_rolling_hills' AND tee_marker='red' AND hole_number=18;

-- siam_waterside
UPDATE course_holes SET yardage=314 WHERE course_id='siam_waterside' AND tee_marker='red' AND hole_number=1;
UPDATE course_holes SET yardage=129 WHERE course_id='siam_waterside' AND tee_marker='red' AND hole_number=2;
UPDATE course_holes SET yardage=394 WHERE course_id='siam_waterside' AND tee_marker='red' AND hole_number=3;
UPDATE course_holes SET yardage=271 WHERE course_id='siam_waterside' AND tee_marker='red' AND hole_number=4;
UPDATE course_holes SET yardage=322 WHERE course_id='siam_waterside' AND tee_marker='red' AND hole_number=5;
UPDATE course_holes SET yardage=395 WHERE course_id='siam_waterside' AND tee_marker='red' AND hole_number=6;
UPDATE course_holes SET yardage=108 WHERE course_id='siam_waterside' AND tee_marker='red' AND hole_number=7;
UPDATE course_holes SET yardage=480 WHERE course_id='siam_waterside' AND tee_marker='red' AND hole_number=8;
UPDATE course_holes SET yardage=310 WHERE course_id='siam_waterside' AND tee_marker='red' AND hole_number=9;
UPDATE course_holes SET yardage=432 WHERE course_id='siam_waterside' AND tee_marker='red' AND hole_number=10;
UPDATE course_holes SET yardage=284 WHERE course_id='siam_waterside' AND tee_marker='red' AND hole_number=11;
UPDATE course_holes SET yardage=115 WHERE course_id='siam_waterside' AND tee_marker='red' AND hole_number=12;
UPDATE course_holes SET yardage=335 WHERE course_id='siam_waterside' AND tee_marker='red' AND hole_number=13;
UPDATE course_holes SET yardage=300 WHERE course_id='siam_waterside' AND tee_marker='red' AND hole_number=14;
UPDATE course_holes SET yardage=258 WHERE course_id='siam_waterside' AND tee_marker='red' AND hole_number=15;
UPDATE course_holes SET yardage=86 WHERE course_id='siam_waterside' AND tee_marker='red' AND hole_number=16;
UPDATE course_holes SET yardage=316 WHERE course_id='siam_waterside' AND tee_marker='red' AND hole_number=17;
UPDATE course_holes SET yardage=446 WHERE course_id='siam_waterside' AND tee_marker='red' AND hole_number=18;

-- siam_plantation_sugarcane
UPDATE course_holes SET yardage=400 WHERE course_id='siam_plantation_sugarcane' AND tee_marker='black' AND hole_number=1;
UPDATE course_holes SET yardage=405 WHERE course_id='siam_plantation_sugarcane' AND tee_marker='black' AND hole_number=2;
UPDATE course_holes SET yardage=195 WHERE course_id='siam_plantation_sugarcane' AND tee_marker='black' AND hole_number=3;
UPDATE course_holes SET yardage=452 WHERE course_id='siam_plantation_sugarcane' AND tee_marker='black' AND hole_number=4;
UPDATE course_holes SET yardage=596 WHERE course_id='siam_plantation_sugarcane' AND tee_marker='black' AND hole_number=5;
UPDATE course_holes SET yardage=242 WHERE course_id='siam_plantation_sugarcane' AND tee_marker='black' AND hole_number=6;
UPDATE course_holes SET yardage=538 WHERE course_id='siam_plantation_sugarcane' AND tee_marker='black' AND hole_number=7;
UPDATE course_holes SET yardage=410 WHERE course_id='siam_plantation_sugarcane' AND tee_marker='black' AND hole_number=8;
UPDATE course_holes SET yardage=498 WHERE course_id='siam_plantation_sugarcane' AND tee_marker='black' AND hole_number=9;
UPDATE course_holes SET yardage=367 WHERE course_id='siam_plantation_sugarcane' AND tee_marker='blue' AND hole_number=1;
UPDATE course_holes SET yardage=374 WHERE course_id='siam_plantation_sugarcane' AND tee_marker='blue' AND hole_number=2;
UPDATE course_holes SET yardage=165 WHERE course_id='siam_plantation_sugarcane' AND tee_marker='blue' AND hole_number=3;
UPDATE course_holes SET yardage=418 WHERE course_id='siam_plantation_sugarcane' AND tee_marker='blue' AND hole_number=4;
UPDATE course_holes SET yardage=543 WHERE course_id='siam_plantation_sugarcane' AND tee_marker='blue' AND hole_number=5;
UPDATE course_holes SET yardage=199 WHERE course_id='siam_plantation_sugarcane' AND tee_marker='blue' AND hole_number=6;
UPDATE course_holes SET yardage=506 WHERE course_id='siam_plantation_sugarcane' AND tee_marker='blue' AND hole_number=7;
UPDATE course_holes SET yardage=381 WHERE course_id='siam_plantation_sugarcane' AND tee_marker='blue' AND hole_number=8;
UPDATE course_holes SET yardage=472 WHERE course_id='siam_plantation_sugarcane' AND tee_marker='blue' AND hole_number=9;
UPDATE course_holes SET yardage=296 WHERE course_id='siam_plantation_sugarcane' AND tee_marker='white' AND hole_number=1;
UPDATE course_holes SET yardage=347 WHERE course_id='siam_plantation_sugarcane' AND tee_marker='white' AND hole_number=2;
UPDATE course_holes SET yardage=132 WHERE course_id='siam_plantation_sugarcane' AND tee_marker='white' AND hole_number=3;
UPDATE course_holes SET yardage=390 WHERE course_id='siam_plantation_sugarcane' AND tee_marker='white' AND hole_number=4;
UPDATE course_holes SET yardage=497 WHERE course_id='siam_plantation_sugarcane' AND tee_marker='white' AND hole_number=5;
UPDATE course_holes SET yardage=168 WHERE course_id='siam_plantation_sugarcane' AND tee_marker='white' AND hole_number=6;
UPDATE course_holes SET yardage=465 WHERE course_id='siam_plantation_sugarcane' AND tee_marker='white' AND hole_number=7;
UPDATE course_holes SET yardage=348 WHERE course_id='siam_plantation_sugarcane' AND tee_marker='white' AND hole_number=8;
UPDATE course_holes SET yardage=427 WHERE course_id='siam_plantation_sugarcane' AND tee_marker='white' AND hole_number=9;
UPDATE course_holes SET yardage=258 WHERE course_id='siam_plantation_sugarcane' AND tee_marker='red' AND hole_number=1;
UPDATE course_holes SET yardage=301 WHERE course_id='siam_plantation_sugarcane' AND tee_marker='red' AND hole_number=2;
UPDATE course_holes SET yardage=117 WHERE course_id='siam_plantation_sugarcane' AND tee_marker='red' AND hole_number=3;
UPDATE course_holes SET yardage=302 WHERE course_id='siam_plantation_sugarcane' AND tee_marker='red' AND hole_number=4;
UPDATE course_holes SET yardage=424 WHERE course_id='siam_plantation_sugarcane' AND tee_marker='red' AND hole_number=5;
UPDATE course_holes SET yardage=115 WHERE course_id='siam_plantation_sugarcane' AND tee_marker='red' AND hole_number=6;
UPDATE course_holes SET yardage=432 WHERE course_id='siam_plantation_sugarcane' AND tee_marker='red' AND hole_number=7;
UPDATE course_holes SET yardage=291 WHERE course_id='siam_plantation_sugarcane' AND tee_marker='red' AND hole_number=8;
UPDATE course_holes SET yardage=358 WHERE course_id='siam_plantation_sugarcane' AND tee_marker='red' AND hole_number=9;

-- siam_plantation_tapioca
UPDATE course_holes SET yardage=420 WHERE course_id='siam_plantation_tapioca' AND tee_marker='black' AND hole_number=1;
UPDATE course_holes SET yardage=606 WHERE course_id='siam_plantation_tapioca' AND tee_marker='black' AND hole_number=2;
UPDATE course_holes SET yardage=235 WHERE course_id='siam_plantation_tapioca' AND tee_marker='black' AND hole_number=3;
UPDATE course_holes SET yardage=581 WHERE course_id='siam_plantation_tapioca' AND tee_marker='black' AND hole_number=4;
UPDATE course_holes SET yardage=396 WHERE course_id='siam_plantation_tapioca' AND tee_marker='black' AND hole_number=5;
UPDATE course_holes SET yardage=443 WHERE course_id='siam_plantation_tapioca' AND tee_marker='black' AND hole_number=6;
UPDATE course_holes SET yardage=172 WHERE course_id='siam_plantation_tapioca' AND tee_marker='black' AND hole_number=7;
UPDATE course_holes SET yardage=466 WHERE course_id='siam_plantation_tapioca' AND tee_marker='black' AND hole_number=8;
UPDATE course_holes SET yardage=433 WHERE course_id='siam_plantation_tapioca' AND tee_marker='black' AND hole_number=9;
UPDATE course_holes SET yardage=382 WHERE course_id='siam_plantation_tapioca' AND tee_marker='blue' AND hole_number=1;
UPDATE course_holes SET yardage=571 WHERE course_id='siam_plantation_tapioca' AND tee_marker='blue' AND hole_number=2;
UPDATE course_holes SET yardage=206 WHERE course_id='siam_plantation_tapioca' AND tee_marker='blue' AND hole_number=3;
UPDATE course_holes SET yardage=556 WHERE course_id='siam_plantation_tapioca' AND tee_marker='blue' AND hole_number=4;
UPDATE course_holes SET yardage=362 WHERE course_id='siam_plantation_tapioca' AND tee_marker='blue' AND hole_number=5;
UPDATE course_holes SET yardage=424 WHERE course_id='siam_plantation_tapioca' AND tee_marker='blue' AND hole_number=6;
UPDATE course_holes SET yardage=145 WHERE course_id='siam_plantation_tapioca' AND tee_marker='blue' AND hole_number=7;
UPDATE course_holes SET yardage=423 WHERE course_id='siam_plantation_tapioca' AND tee_marker='blue' AND hole_number=8;
UPDATE course_holes SET yardage=392 WHERE course_id='siam_plantation_tapioca' AND tee_marker='blue' AND hole_number=9;
UPDATE course_holes SET yardage=347 WHERE course_id='siam_plantation_tapioca' AND tee_marker='white' AND hole_number=1;
UPDATE course_holes SET yardage=500 WHERE course_id='siam_plantation_tapioca' AND tee_marker='white' AND hole_number=2;
UPDATE course_holes SET yardage=171 WHERE course_id='siam_plantation_tapioca' AND tee_marker='white' AND hole_number=3;
UPDATE course_holes SET yardage=520 WHERE course_id='siam_plantation_tapioca' AND tee_marker='white' AND hole_number=4;
UPDATE course_holes SET yardage=337 WHERE course_id='siam_plantation_tapioca' AND tee_marker='white' AND hole_number=5;
UPDATE course_holes SET yardage=354 WHERE course_id='siam_plantation_tapioca' AND tee_marker='white' AND hole_number=6;
UPDATE course_holes SET yardage=124 WHERE course_id='siam_plantation_tapioca' AND tee_marker='white' AND hole_number=7;
UPDATE course_holes SET yardage=385 WHERE course_id='siam_plantation_tapioca' AND tee_marker='white' AND hole_number=8;
UPDATE course_holes SET yardage=355 WHERE course_id='siam_plantation_tapioca' AND tee_marker='white' AND hole_number=9;
UPDATE course_holes SET yardage=258 WHERE course_id='siam_plantation_tapioca' AND tee_marker='red' AND hole_number=1;
UPDATE course_holes SET yardage=422 WHERE course_id='siam_plantation_tapioca' AND tee_marker='red' AND hole_number=2;
UPDATE course_holes SET yardage=122 WHERE course_id='siam_plantation_tapioca' AND tee_marker='red' AND hole_number=3;
UPDATE course_holes SET yardage=442 WHERE course_id='siam_plantation_tapioca' AND tee_marker='red' AND hole_number=4;
UPDATE course_holes SET yardage=301 WHERE course_id='siam_plantation_tapioca' AND tee_marker='red' AND hole_number=5;
UPDATE course_holes SET yardage=315 WHERE course_id='siam_plantation_tapioca' AND tee_marker='red' AND hole_number=6;
UPDATE course_holes SET yardage=101 WHERE course_id='siam_plantation_tapioca' AND tee_marker='red' AND hole_number=7;
UPDATE course_holes SET yardage=335 WHERE course_id='siam_plantation_tapioca' AND tee_marker='red' AND hole_number=8;
UPDATE course_holes SET yardage=316 WHERE course_id='siam_plantation_tapioca' AND tee_marker='red' AND hole_number=9;

-- siam_plantation_pineapple
UPDATE course_holes SET yardage=405 WHERE course_id='siam_plantation_pineapple' AND tee_marker='black' AND hole_number=1;
UPDATE course_holes SET yardage=566 WHERE course_id='siam_plantation_pineapple' AND tee_marker='black' AND hole_number=2;
UPDATE course_holes SET yardage=235 WHERE course_id='siam_plantation_pineapple' AND tee_marker='black' AND hole_number=3;
UPDATE course_holes SET yardage=412 WHERE course_id='siam_plantation_pineapple' AND tee_marker='black' AND hole_number=4;
UPDATE course_holes SET yardage=371 WHERE course_id='siam_plantation_pineapple' AND tee_marker='black' AND hole_number=5;
UPDATE course_holes SET yardage=578 WHERE course_id='siam_plantation_pineapple' AND tee_marker='black' AND hole_number=6;
UPDATE course_holes SET yardage=461 WHERE course_id='siam_plantation_pineapple' AND tee_marker='black' AND hole_number=7;
UPDATE course_holes SET yardage=184 WHERE course_id='siam_plantation_pineapple' AND tee_marker='black' AND hole_number=8;
UPDATE course_holes SET yardage=433 WHERE course_id='siam_plantation_pineapple' AND tee_marker='black' AND hole_number=9;
UPDATE course_holes SET yardage=375 WHERE course_id='siam_plantation_pineapple' AND tee_marker='blue' AND hole_number=1;
UPDATE course_holes SET yardage=537 WHERE course_id='siam_plantation_pineapple' AND tee_marker='blue' AND hole_number=2;
UPDATE course_holes SET yardage=197 WHERE course_id='siam_plantation_pineapple' AND tee_marker='blue' AND hole_number=3;
UPDATE course_holes SET yardage=378 WHERE course_id='siam_plantation_pineapple' AND tee_marker='blue' AND hole_number=4;
UPDATE course_holes SET yardage=347 WHERE course_id='siam_plantation_pineapple' AND tee_marker='blue' AND hole_number=5;
UPDATE course_holes SET yardage=551 WHERE course_id='siam_plantation_pineapple' AND tee_marker='blue' AND hole_number=6;
UPDATE course_holes SET yardage=421 WHERE course_id='siam_plantation_pineapple' AND tee_marker='blue' AND hole_number=7;
UPDATE course_holes SET yardage=165 WHERE course_id='siam_plantation_pineapple' AND tee_marker='blue' AND hole_number=8;
UPDATE course_holes SET yardage=400 WHERE course_id='siam_plantation_pineapple' AND tee_marker='blue' AND hole_number=9;
UPDATE course_holes SET yardage=287 WHERE course_id='siam_plantation_pineapple' AND tee_marker='white' AND hole_number=1;
UPDATE course_holes SET yardage=475 WHERE course_id='siam_plantation_pineapple' AND tee_marker='white' AND hole_number=2;
UPDATE course_holes SET yardage=164 WHERE course_id='siam_plantation_pineapple' AND tee_marker='white' AND hole_number=3;
UPDATE course_holes SET yardage=343 WHERE course_id='siam_plantation_pineapple' AND tee_marker='white' AND hole_number=4;
UPDATE course_holes SET yardage=316 WHERE course_id='siam_plantation_pineapple' AND tee_marker='white' AND hole_number=5;
UPDATE course_holes SET yardage=512 WHERE course_id='siam_plantation_pineapple' AND tee_marker='white' AND hole_number=6;
UPDATE course_holes SET yardage=382 WHERE course_id='siam_plantation_pineapple' AND tee_marker='white' AND hole_number=7;
UPDATE course_holes SET yardage=145 WHERE course_id='siam_plantation_pineapple' AND tee_marker='white' AND hole_number=8;
UPDATE course_holes SET yardage=361 WHERE course_id='siam_plantation_pineapple' AND tee_marker='white' AND hole_number=9;
UPDATE course_holes SET yardage=251 WHERE course_id='siam_plantation_pineapple' AND tee_marker='red' AND hole_number=1;
UPDATE course_holes SET yardage=430 WHERE course_id='siam_plantation_pineapple' AND tee_marker='red' AND hole_number=2;
UPDATE course_holes SET yardage=114 WHERE course_id='siam_plantation_pineapple' AND tee_marker='red' AND hole_number=3;
UPDATE course_holes SET yardage=281 WHERE course_id='siam_plantation_pineapple' AND tee_marker='red' AND hole_number=4;
UPDATE course_holes SET yardage=286 WHERE course_id='siam_plantation_pineapple' AND tee_marker='red' AND hole_number=5;
UPDATE course_holes SET yardage=437 WHERE course_id='siam_plantation_pineapple' AND tee_marker='red' AND hole_number=6;
UPDATE course_holes SET yardage=325 WHERE course_id='siam_plantation_pineapple' AND tee_marker='red' AND hole_number=7;
UPDATE course_holes SET yardage=118 WHERE course_id='siam_plantation_pineapple' AND tee_marker='red' AND hole_number=8;
UPDATE course_holes SET yardage=301 WHERE course_id='siam_plantation_pineapple' AND tee_marker='red' AND hole_number=9;

-- siam_plantation (pre-merged C/A)
UPDATE course_holes SET yardage=405 WHERE course_id='siam_plantation' AND tee_marker='black' AND hole_number=1;
UPDATE course_holes SET yardage=566 WHERE course_id='siam_plantation' AND tee_marker='black' AND hole_number=2;
UPDATE course_holes SET yardage=235 WHERE course_id='siam_plantation' AND tee_marker='black' AND hole_number=3;
UPDATE course_holes SET yardage=412 WHERE course_id='siam_plantation' AND tee_marker='black' AND hole_number=4;
UPDATE course_holes SET yardage=371 WHERE course_id='siam_plantation' AND tee_marker='black' AND hole_number=5;
UPDATE course_holes SET yardage=578 WHERE course_id='siam_plantation' AND tee_marker='black' AND hole_number=6;
UPDATE course_holes SET yardage=461 WHERE course_id='siam_plantation' AND tee_marker='black' AND hole_number=7;
UPDATE course_holes SET yardage=184 WHERE course_id='siam_plantation' AND tee_marker='black' AND hole_number=8;
UPDATE course_holes SET yardage=433 WHERE course_id='siam_plantation' AND tee_marker='black' AND hole_number=9;
UPDATE course_holes SET yardage=400 WHERE course_id='siam_plantation' AND tee_marker='black' AND hole_number=10;
UPDATE course_holes SET yardage=405 WHERE course_id='siam_plantation' AND tee_marker='black' AND hole_number=11;
UPDATE course_holes SET yardage=195 WHERE course_id='siam_plantation' AND tee_marker='black' AND hole_number=12;
UPDATE course_holes SET yardage=452 WHERE course_id='siam_plantation' AND tee_marker='black' AND hole_number=13;
UPDATE course_holes SET yardage=596 WHERE course_id='siam_plantation' AND tee_marker='black' AND hole_number=14;
UPDATE course_holes SET yardage=242 WHERE course_id='siam_plantation' AND tee_marker='black' AND hole_number=15;
UPDATE course_holes SET yardage=538 WHERE course_id='siam_plantation' AND tee_marker='black' AND hole_number=16;
UPDATE course_holes SET yardage=410 WHERE course_id='siam_plantation' AND tee_marker='black' AND hole_number=17;
UPDATE course_holes SET yardage=498 WHERE course_id='siam_plantation' AND tee_marker='black' AND hole_number=18;
UPDATE course_holes SET yardage=375 WHERE course_id='siam_plantation' AND tee_marker='blue' AND hole_number=1;
UPDATE course_holes SET yardage=537 WHERE course_id='siam_plantation' AND tee_marker='blue' AND hole_number=2;
UPDATE course_holes SET yardage=197 WHERE course_id='siam_plantation' AND tee_marker='blue' AND hole_number=3;
UPDATE course_holes SET yardage=378 WHERE course_id='siam_plantation' AND tee_marker='blue' AND hole_number=4;
UPDATE course_holes SET yardage=347 WHERE course_id='siam_plantation' AND tee_marker='blue' AND hole_number=5;
UPDATE course_holes SET yardage=551 WHERE course_id='siam_plantation' AND tee_marker='blue' AND hole_number=6;
UPDATE course_holes SET yardage=421 WHERE course_id='siam_plantation' AND tee_marker='blue' AND hole_number=7;
UPDATE course_holes SET yardage=165 WHERE course_id='siam_plantation' AND tee_marker='blue' AND hole_number=8;
UPDATE course_holes SET yardage=400 WHERE course_id='siam_plantation' AND tee_marker='blue' AND hole_number=9;
UPDATE course_holes SET yardage=367 WHERE course_id='siam_plantation' AND tee_marker='blue' AND hole_number=10;
UPDATE course_holes SET yardage=374 WHERE course_id='siam_plantation' AND tee_marker='blue' AND hole_number=11;
UPDATE course_holes SET yardage=165 WHERE course_id='siam_plantation' AND tee_marker='blue' AND hole_number=12;
UPDATE course_holes SET yardage=418 WHERE course_id='siam_plantation' AND tee_marker='blue' AND hole_number=13;
UPDATE course_holes SET yardage=543 WHERE course_id='siam_plantation' AND tee_marker='blue' AND hole_number=14;
UPDATE course_holes SET yardage=199 WHERE course_id='siam_plantation' AND tee_marker='blue' AND hole_number=15;
UPDATE course_holes SET yardage=506 WHERE course_id='siam_plantation' AND tee_marker='blue' AND hole_number=16;
UPDATE course_holes SET yardage=381 WHERE course_id='siam_plantation' AND tee_marker='blue' AND hole_number=17;
UPDATE course_holes SET yardage=472 WHERE course_id='siam_plantation' AND tee_marker='blue' AND hole_number=18;
UPDATE course_holes SET yardage=287 WHERE course_id='siam_plantation' AND tee_marker='white' AND hole_number=1;
UPDATE course_holes SET yardage=475 WHERE course_id='siam_plantation' AND tee_marker='white' AND hole_number=2;
UPDATE course_holes SET yardage=164 WHERE course_id='siam_plantation' AND tee_marker='white' AND hole_number=3;
UPDATE course_holes SET yardage=343 WHERE course_id='siam_plantation' AND tee_marker='white' AND hole_number=4;
UPDATE course_holes SET yardage=316 WHERE course_id='siam_plantation' AND tee_marker='white' AND hole_number=5;
UPDATE course_holes SET yardage=512 WHERE course_id='siam_plantation' AND tee_marker='white' AND hole_number=6;
UPDATE course_holes SET yardage=382 WHERE course_id='siam_plantation' AND tee_marker='white' AND hole_number=7;
UPDATE course_holes SET yardage=145 WHERE course_id='siam_plantation' AND tee_marker='white' AND hole_number=8;
UPDATE course_holes SET yardage=361 WHERE course_id='siam_plantation' AND tee_marker='white' AND hole_number=9;
UPDATE course_holes SET yardage=296 WHERE course_id='siam_plantation' AND tee_marker='white' AND hole_number=10;
UPDATE course_holes SET yardage=347 WHERE course_id='siam_plantation' AND tee_marker='white' AND hole_number=11;
UPDATE course_holes SET yardage=132 WHERE course_id='siam_plantation' AND tee_marker='white' AND hole_number=12;
UPDATE course_holes SET yardage=390 WHERE course_id='siam_plantation' AND tee_marker='white' AND hole_number=13;
UPDATE course_holes SET yardage=497 WHERE course_id='siam_plantation' AND tee_marker='white' AND hole_number=14;
UPDATE course_holes SET yardage=168 WHERE course_id='siam_plantation' AND tee_marker='white' AND hole_number=15;
UPDATE course_holes SET yardage=465 WHERE course_id='siam_plantation' AND tee_marker='white' AND hole_number=16;
UPDATE course_holes SET yardage=348 WHERE course_id='siam_plantation' AND tee_marker='white' AND hole_number=17;
UPDATE course_holes SET yardage=427 WHERE course_id='siam_plantation' AND tee_marker='white' AND hole_number=18;
UPDATE course_holes SET yardage=251 WHERE course_id='siam_plantation' AND tee_marker='red' AND hole_number=1;
UPDATE course_holes SET yardage=430 WHERE course_id='siam_plantation' AND tee_marker='red' AND hole_number=2;
UPDATE course_holes SET yardage=114 WHERE course_id='siam_plantation' AND tee_marker='red' AND hole_number=3;
UPDATE course_holes SET yardage=281 WHERE course_id='siam_plantation' AND tee_marker='red' AND hole_number=4;
UPDATE course_holes SET yardage=286 WHERE course_id='siam_plantation' AND tee_marker='red' AND hole_number=5;
UPDATE course_holes SET yardage=437 WHERE course_id='siam_plantation' AND tee_marker='red' AND hole_number=6;
UPDATE course_holes SET yardage=325 WHERE course_id='siam_plantation' AND tee_marker='red' AND hole_number=7;
UPDATE course_holes SET yardage=118 WHERE course_id='siam_plantation' AND tee_marker='red' AND hole_number=8;
UPDATE course_holes SET yardage=301 WHERE course_id='siam_plantation' AND tee_marker='red' AND hole_number=9;
UPDATE course_holes SET yardage=258 WHERE course_id='siam_plantation' AND tee_marker='red' AND hole_number=10;
UPDATE course_holes SET yardage=301 WHERE course_id='siam_plantation' AND tee_marker='red' AND hole_number=11;
UPDATE course_holes SET yardage=117 WHERE course_id='siam_plantation' AND tee_marker='red' AND hole_number=12;
UPDATE course_holes SET yardage=302 WHERE course_id='siam_plantation' AND tee_marker='red' AND hole_number=13;
UPDATE course_holes SET yardage=424 WHERE course_id='siam_plantation' AND tee_marker='red' AND hole_number=14;
UPDATE course_holes SET yardage=115 WHERE course_id='siam_plantation' AND tee_marker='red' AND hole_number=15;
UPDATE course_holes SET yardage=432 WHERE course_id='siam_plantation' AND tee_marker='red' AND hole_number=16;
UPDATE course_holes SET yardage=291 WHERE course_id='siam_plantation' AND tee_marker='red' AND hole_number=17;
UPDATE course_holes SET yardage=358 WHERE course_id='siam_plantation' AND tee_marker='red' AND hole_number=18;

-- laem_chabang_ab
UPDATE course_holes SET yardage=386 WHERE course_id='laem_chabang_ab' AND tee_marker='black' AND hole_number=1;
UPDATE course_holes SET yardage=190 WHERE course_id='laem_chabang_ab' AND tee_marker='black' AND hole_number=2;
UPDATE course_holes SET yardage=436 WHERE course_id='laem_chabang_ab' AND tee_marker='black' AND hole_number=3;
UPDATE course_holes SET yardage=527 WHERE course_id='laem_chabang_ab' AND tee_marker='black' AND hole_number=4;
UPDATE course_holes SET yardage=414 WHERE course_id='laem_chabang_ab' AND tee_marker='black' AND hole_number=5;
UPDATE course_holes SET yardage=385 WHERE course_id='laem_chabang_ab' AND tee_marker='black' AND hole_number=6;
UPDATE course_holes SET yardage=217 WHERE course_id='laem_chabang_ab' AND tee_marker='black' AND hole_number=7;
UPDATE course_holes SET yardage=537 WHERE course_id='laem_chabang_ab' AND tee_marker='black' AND hole_number=8;
UPDATE course_holes SET yardage=425 WHERE course_id='laem_chabang_ab' AND tee_marker='black' AND hole_number=9;
UPDATE course_holes SET yardage=373 WHERE course_id='laem_chabang_ab' AND tee_marker='blue' AND hole_number=1;
UPDATE course_holes SET yardage=175 WHERE course_id='laem_chabang_ab' AND tee_marker='blue' AND hole_number=2;
UPDATE course_holes SET yardage=420 WHERE course_id='laem_chabang_ab' AND tee_marker='blue' AND hole_number=3;
UPDATE course_holes SET yardage=511 WHERE course_id='laem_chabang_ab' AND tee_marker='blue' AND hole_number=4;
UPDATE course_holes SET yardage=399 WHERE course_id='laem_chabang_ab' AND tee_marker='blue' AND hole_number=5;
UPDATE course_holes SET yardage=370 WHERE course_id='laem_chabang_ab' AND tee_marker='blue' AND hole_number=6;
UPDATE course_holes SET yardage=197 WHERE course_id='laem_chabang_ab' AND tee_marker='blue' AND hole_number=7;
UPDATE course_holes SET yardage=517 WHERE course_id='laem_chabang_ab' AND tee_marker='blue' AND hole_number=8;
UPDATE course_holes SET yardage=398 WHERE course_id='laem_chabang_ab' AND tee_marker='blue' AND hole_number=9;
UPDATE course_holes SET yardage=339 WHERE course_id='laem_chabang_ab' AND tee_marker='white' AND hole_number=1;
UPDATE course_holes SET yardage=167 WHERE course_id='laem_chabang_ab' AND tee_marker='white' AND hole_number=2;
UPDATE course_holes SET yardage=375 WHERE course_id='laem_chabang_ab' AND tee_marker='white' AND hole_number=3;
UPDATE course_holes SET yardage=480 WHERE course_id='laem_chabang_ab' AND tee_marker='white' AND hole_number=4;
UPDATE course_holes SET yardage=381 WHERE course_id='laem_chabang_ab' AND tee_marker='white' AND hole_number=5;
UPDATE course_holes SET yardage=356 WHERE course_id='laem_chabang_ab' AND tee_marker='white' AND hole_number=6;
UPDATE course_holes SET yardage=178 WHERE course_id='laem_chabang_ab' AND tee_marker='white' AND hole_number=7;
UPDATE course_holes SET yardage=460 WHERE course_id='laem_chabang_ab' AND tee_marker='white' AND hole_number=8;
UPDATE course_holes SET yardage=381 WHERE course_id='laem_chabang_ab' AND tee_marker='white' AND hole_number=9;
UPDATE course_holes SET yardage=272 WHERE course_id='laem_chabang_ab' AND tee_marker='red' AND hole_number=1;
UPDATE course_holes SET yardage=135 WHERE course_id='laem_chabang_ab' AND tee_marker='red' AND hole_number=2;
UPDATE course_holes SET yardage=367 WHERE course_id='laem_chabang_ab' AND tee_marker='red' AND hole_number=3;
UPDATE course_holes SET yardage=447 WHERE course_id='laem_chabang_ab' AND tee_marker='red' AND hole_number=4;
UPDATE course_holes SET yardage=353 WHERE course_id='laem_chabang_ab' AND tee_marker='red' AND hole_number=5;
UPDATE course_holes SET yardage=309 WHERE course_id='laem_chabang_ab' AND tee_marker='red' AND hole_number=6;
UPDATE course_holes SET yardage=163 WHERE course_id='laem_chabang_ab' AND tee_marker='red' AND hole_number=7;
UPDATE course_holes SET yardage=436 WHERE course_id='laem_chabang_ab' AND tee_marker='red' AND hole_number=8;
UPDATE course_holes SET yardage=261 WHERE course_id='laem_chabang_ab' AND tee_marker='red' AND hole_number=9;
DELETE FROM course_holes WHERE course_id='laem_chabang_ab' AND tee_marker='yellow';
INSERT INTO course_holes (course_id, hole_number, tee_marker, par, stroke_index, yardage) VALUES
 ('laem_chabang_ab',1,'yellow',4,5,231),
 ('laem_chabang_ab',2,'yellow',3,7,107),
 ('laem_chabang_ab',3,'yellow',4,11,341),
 ('laem_chabang_ab',4,'yellow',5,15,408),
 ('laem_chabang_ab',5,'yellow',4,17,259),
 ('laem_chabang_ab',6,'yellow',4,3,271),
 ('laem_chabang_ab',7,'yellow',3,13,131),
 ('laem_chabang_ab',8,'yellow',5,9,353),
 ('laem_chabang_ab',9,'yellow',4,1,249),
 ('laem_chabang_ab',10,'yellow',4,10,280),
 ('laem_chabang_ab',11,'yellow',5,6,442),
 ('laem_chabang_ab',12,'yellow',4,4,279),
 ('laem_chabang_ab',13,'yellow',4,18,252),
 ('laem_chabang_ab',14,'yellow',3,14,123),
 ('laem_chabang_ab',15,'yellow',4,2,355),
 ('laem_chabang_ab',16,'yellow',4,12,236),
 ('laem_chabang_ab',17,'yellow',3,16,83),
 ('laem_chabang_ab',18,'yellow',5,8,390);

-- laem_chabang_ac
UPDATE course_holes SET yardage=386 WHERE course_id='laem_chabang_ac' AND tee_marker='black' AND hole_number=1;
UPDATE course_holes SET yardage=190 WHERE course_id='laem_chabang_ac' AND tee_marker='black' AND hole_number=2;
UPDATE course_holes SET yardage=436 WHERE course_id='laem_chabang_ac' AND tee_marker='black' AND hole_number=3;
UPDATE course_holes SET yardage=527 WHERE course_id='laem_chabang_ac' AND tee_marker='black' AND hole_number=4;
UPDATE course_holes SET yardage=414 WHERE course_id='laem_chabang_ac' AND tee_marker='black' AND hole_number=5;
UPDATE course_holes SET yardage=385 WHERE course_id='laem_chabang_ac' AND tee_marker='black' AND hole_number=6;
UPDATE course_holes SET yardage=217 WHERE course_id='laem_chabang_ac' AND tee_marker='black' AND hole_number=7;
UPDATE course_holes SET yardage=537 WHERE course_id='laem_chabang_ac' AND tee_marker='black' AND hole_number=8;
UPDATE course_holes SET yardage=425 WHERE course_id='laem_chabang_ac' AND tee_marker='black' AND hole_number=9;
UPDATE course_holes SET yardage=437 WHERE course_id='laem_chabang_ac' AND tee_marker='black' AND hole_number=10;
UPDATE course_holes SET yardage=539 WHERE course_id='laem_chabang_ac' AND tee_marker='black' AND hole_number=11;
UPDATE course_holes SET yardage=420 WHERE course_id='laem_chabang_ac' AND tee_marker='black' AND hole_number=12;
UPDATE course_holes SET yardage=452 WHERE course_id='laem_chabang_ac' AND tee_marker='black' AND hole_number=13;
UPDATE course_holes SET yardage=198 WHERE course_id='laem_chabang_ac' AND tee_marker='black' AND hole_number=14;
UPDATE course_holes SET yardage=552 WHERE course_id='laem_chabang_ac' AND tee_marker='black' AND hole_number=15;
UPDATE course_holes SET yardage=418 WHERE course_id='laem_chabang_ac' AND tee_marker='black' AND hole_number=16;
UPDATE course_holes SET yardage=164 WHERE course_id='laem_chabang_ac' AND tee_marker='black' AND hole_number=17;
UPDATE course_holes SET yardage=421 WHERE course_id='laem_chabang_ac' AND tee_marker='black' AND hole_number=18;
UPDATE course_holes SET yardage=373 WHERE course_id='laem_chabang_ac' AND tee_marker='blue' AND hole_number=1;
UPDATE course_holes SET yardage=175 WHERE course_id='laem_chabang_ac' AND tee_marker='blue' AND hole_number=2;
UPDATE course_holes SET yardage=420 WHERE course_id='laem_chabang_ac' AND tee_marker='blue' AND hole_number=3;
UPDATE course_holes SET yardage=511 WHERE course_id='laem_chabang_ac' AND tee_marker='blue' AND hole_number=4;
UPDATE course_holes SET yardage=399 WHERE course_id='laem_chabang_ac' AND tee_marker='blue' AND hole_number=5;
UPDATE course_holes SET yardage=370 WHERE course_id='laem_chabang_ac' AND tee_marker='blue' AND hole_number=6;
UPDATE course_holes SET yardage=197 WHERE course_id='laem_chabang_ac' AND tee_marker='blue' AND hole_number=7;
UPDATE course_holes SET yardage=517 WHERE course_id='laem_chabang_ac' AND tee_marker='blue' AND hole_number=8;
UPDATE course_holes SET yardage=398 WHERE course_id='laem_chabang_ac' AND tee_marker='blue' AND hole_number=9;
UPDATE course_holes SET yardage=421 WHERE course_id='laem_chabang_ac' AND tee_marker='blue' AND hole_number=10;
UPDATE course_holes SET yardage=516 WHERE course_id='laem_chabang_ac' AND tee_marker='blue' AND hole_number=11;
UPDATE course_holes SET yardage=401 WHERE course_id='laem_chabang_ac' AND tee_marker='blue' AND hole_number=12;
UPDATE course_holes SET yardage=421 WHERE course_id='laem_chabang_ac' AND tee_marker='blue' AND hole_number=13;
UPDATE course_holes SET yardage=191 WHERE course_id='laem_chabang_ac' AND tee_marker='blue' AND hole_number=14;
UPDATE course_holes SET yardage=522 WHERE course_id='laem_chabang_ac' AND tee_marker='blue' AND hole_number=15;
UPDATE course_holes SET yardage=413 WHERE course_id='laem_chabang_ac' AND tee_marker='blue' AND hole_number=16;
UPDATE course_holes SET yardage=158 WHERE course_id='laem_chabang_ac' AND tee_marker='blue' AND hole_number=17;
UPDATE course_holes SET yardage=402 WHERE course_id='laem_chabang_ac' AND tee_marker='blue' AND hole_number=18;
UPDATE course_holes SET yardage=339 WHERE course_id='laem_chabang_ac' AND tee_marker='white' AND hole_number=1;
UPDATE course_holes SET yardage=167 WHERE course_id='laem_chabang_ac' AND tee_marker='white' AND hole_number=2;
UPDATE course_holes SET yardage=375 WHERE course_id='laem_chabang_ac' AND tee_marker='white' AND hole_number=3;
UPDATE course_holes SET yardage=480 WHERE course_id='laem_chabang_ac' AND tee_marker='white' AND hole_number=4;
UPDATE course_holes SET yardage=381 WHERE course_id='laem_chabang_ac' AND tee_marker='white' AND hole_number=5;
UPDATE course_holes SET yardage=356 WHERE course_id='laem_chabang_ac' AND tee_marker='white' AND hole_number=6;
UPDATE course_holes SET yardage=178 WHERE course_id='laem_chabang_ac' AND tee_marker='white' AND hole_number=7;
UPDATE course_holes SET yardage=460 WHERE course_id='laem_chabang_ac' AND tee_marker='white' AND hole_number=8;
UPDATE course_holes SET yardage=381 WHERE course_id='laem_chabang_ac' AND tee_marker='white' AND hole_number=9;
UPDATE course_holes SET yardage=400 WHERE course_id='laem_chabang_ac' AND tee_marker='white' AND hole_number=10;
UPDATE course_holes SET yardage=487 WHERE course_id='laem_chabang_ac' AND tee_marker='white' AND hole_number=11;
UPDATE course_holes SET yardage=374 WHERE course_id='laem_chabang_ac' AND tee_marker='white' AND hole_number=12;
UPDATE course_holes SET yardage=397 WHERE course_id='laem_chabang_ac' AND tee_marker='white' AND hole_number=13;
UPDATE course_holes SET yardage=174 WHERE course_id='laem_chabang_ac' AND tee_marker='white' AND hole_number=14;
UPDATE course_holes SET yardage=494 WHERE course_id='laem_chabang_ac' AND tee_marker='white' AND hole_number=15;
UPDATE course_holes SET yardage=390 WHERE course_id='laem_chabang_ac' AND tee_marker='white' AND hole_number=16;
UPDATE course_holes SET yardage=142 WHERE course_id='laem_chabang_ac' AND tee_marker='white' AND hole_number=17;
UPDATE course_holes SET yardage=393 WHERE course_id='laem_chabang_ac' AND tee_marker='white' AND hole_number=18;
UPDATE course_holes SET yardage=272 WHERE course_id='laem_chabang_ac' AND tee_marker='red' AND hole_number=1;
UPDATE course_holes SET yardage=135 WHERE course_id='laem_chabang_ac' AND tee_marker='red' AND hole_number=2;
UPDATE course_holes SET yardage=367 WHERE course_id='laem_chabang_ac' AND tee_marker='red' AND hole_number=3;
UPDATE course_holes SET yardage=447 WHERE course_id='laem_chabang_ac' AND tee_marker='red' AND hole_number=4;
UPDATE course_holes SET yardage=353 WHERE course_id='laem_chabang_ac' AND tee_marker='red' AND hole_number=5;
UPDATE course_holes SET yardage=309 WHERE course_id='laem_chabang_ac' AND tee_marker='red' AND hole_number=6;
UPDATE course_holes SET yardage=163 WHERE course_id='laem_chabang_ac' AND tee_marker='red' AND hole_number=7;
UPDATE course_holes SET yardage=436 WHERE course_id='laem_chabang_ac' AND tee_marker='red' AND hole_number=8;
UPDATE course_holes SET yardage=261 WHERE course_id='laem_chabang_ac' AND tee_marker='red' AND hole_number=9;
UPDATE course_holes SET yardage=377 WHERE course_id='laem_chabang_ac' AND tee_marker='red' AND hole_number=10;
UPDATE course_holes SET yardage=454 WHERE course_id='laem_chabang_ac' AND tee_marker='red' AND hole_number=11;
UPDATE course_holes SET yardage=334 WHERE course_id='laem_chabang_ac' AND tee_marker='red' AND hole_number=12;
UPDATE course_holes SET yardage=368 WHERE course_id='laem_chabang_ac' AND tee_marker='red' AND hole_number=13;
UPDATE course_holes SET yardage=143 WHERE course_id='laem_chabang_ac' AND tee_marker='red' AND hole_number=14;
UPDATE course_holes SET yardage=465 WHERE course_id='laem_chabang_ac' AND tee_marker='red' AND hole_number=15;
UPDATE course_holes SET yardage=372 WHERE course_id='laem_chabang_ac' AND tee_marker='red' AND hole_number=16;
UPDATE course_holes SET yardage=126 WHERE course_id='laem_chabang_ac' AND tee_marker='red' AND hole_number=17;
UPDATE course_holes SET yardage=369 WHERE course_id='laem_chabang_ac' AND tee_marker='red' AND hole_number=18;
DELETE FROM course_holes WHERE course_id='laem_chabang_ac' AND tee_marker='yellow';
INSERT INTO course_holes (course_id, hole_number, tee_marker, par, stroke_index, yardage) VALUES
 ('laem_chabang_ac',1,'yellow',4,6,231),
 ('laem_chabang_ac',2,'yellow',3,8,107),
 ('laem_chabang_ac',3,'yellow',4,12,341),
 ('laem_chabang_ac',4,'yellow',5,16,408),
 ('laem_chabang_ac',5,'yellow',4,18,259),
 ('laem_chabang_ac',6,'yellow',4,4,271),
 ('laem_chabang_ac',7,'yellow',3,14,131),
 ('laem_chabang_ac',8,'yellow',5,10,353),
 ('laem_chabang_ac',9,'yellow',4,2,249),
 ('laem_chabang_ac',10,'yellow',4,7,350),
 ('laem_chabang_ac',11,'yellow',5,5,424),
 ('laem_chabang_ac',12,'yellow',4,3,301),
 ('laem_chabang_ac',13,'yellow',4,1,336),
 ('laem_chabang_ac',14,'yellow',3,15,121),
 ('laem_chabang_ac',15,'yellow',5,11,440),
 ('laem_chabang_ac',16,'yellow',4,13,348),
 ('laem_chabang_ac',17,'yellow',3,17,108),
 ('laem_chabang_ac',18,'yellow',4,9,276);

-- laem_chabang_bc
UPDATE course_holes SET yardage=437 WHERE course_id='laem_chabang_bc' AND tee_marker='black' AND hole_number=10;
UPDATE course_holes SET yardage=539 WHERE course_id='laem_chabang_bc' AND tee_marker='black' AND hole_number=11;
UPDATE course_holes SET yardage=420 WHERE course_id='laem_chabang_bc' AND tee_marker='black' AND hole_number=12;
UPDATE course_holes SET yardage=452 WHERE course_id='laem_chabang_bc' AND tee_marker='black' AND hole_number=13;
UPDATE course_holes SET yardage=198 WHERE course_id='laem_chabang_bc' AND tee_marker='black' AND hole_number=14;
UPDATE course_holes SET yardage=552 WHERE course_id='laem_chabang_bc' AND tee_marker='black' AND hole_number=15;
UPDATE course_holes SET yardage=418 WHERE course_id='laem_chabang_bc' AND tee_marker='black' AND hole_number=16;
UPDATE course_holes SET yardage=164 WHERE course_id='laem_chabang_bc' AND tee_marker='black' AND hole_number=17;
UPDATE course_holes SET yardage=421 WHERE course_id='laem_chabang_bc' AND tee_marker='black' AND hole_number=18;
UPDATE course_holes SET yardage=421 WHERE course_id='laem_chabang_bc' AND tee_marker='blue' AND hole_number=10;
UPDATE course_holes SET yardage=516 WHERE course_id='laem_chabang_bc' AND tee_marker='blue' AND hole_number=11;
UPDATE course_holes SET yardage=401 WHERE course_id='laem_chabang_bc' AND tee_marker='blue' AND hole_number=12;
UPDATE course_holes SET yardage=421 WHERE course_id='laem_chabang_bc' AND tee_marker='blue' AND hole_number=13;
UPDATE course_holes SET yardage=191 WHERE course_id='laem_chabang_bc' AND tee_marker='blue' AND hole_number=14;
UPDATE course_holes SET yardage=522 WHERE course_id='laem_chabang_bc' AND tee_marker='blue' AND hole_number=15;
UPDATE course_holes SET yardage=413 WHERE course_id='laem_chabang_bc' AND tee_marker='blue' AND hole_number=16;
UPDATE course_holes SET yardage=158 WHERE course_id='laem_chabang_bc' AND tee_marker='blue' AND hole_number=17;
UPDATE course_holes SET yardage=402 WHERE course_id='laem_chabang_bc' AND tee_marker='blue' AND hole_number=18;
UPDATE course_holes SET yardage=400 WHERE course_id='laem_chabang_bc' AND tee_marker='white' AND hole_number=10;
UPDATE course_holes SET yardage=487 WHERE course_id='laem_chabang_bc' AND tee_marker='white' AND hole_number=11;
UPDATE course_holes SET yardage=374 WHERE course_id='laem_chabang_bc' AND tee_marker='white' AND hole_number=12;
UPDATE course_holes SET yardage=397 WHERE course_id='laem_chabang_bc' AND tee_marker='white' AND hole_number=13;
UPDATE course_holes SET yardage=174 WHERE course_id='laem_chabang_bc' AND tee_marker='white' AND hole_number=14;
UPDATE course_holes SET yardage=494 WHERE course_id='laem_chabang_bc' AND tee_marker='white' AND hole_number=15;
UPDATE course_holes SET yardage=390 WHERE course_id='laem_chabang_bc' AND tee_marker='white' AND hole_number=16;
UPDATE course_holes SET yardage=142 WHERE course_id='laem_chabang_bc' AND tee_marker='white' AND hole_number=17;
UPDATE course_holes SET yardage=393 WHERE course_id='laem_chabang_bc' AND tee_marker='white' AND hole_number=18;
UPDATE course_holes SET yardage=377 WHERE course_id='laem_chabang_bc' AND tee_marker='red' AND hole_number=10;
UPDATE course_holes SET yardage=454 WHERE course_id='laem_chabang_bc' AND tee_marker='red' AND hole_number=11;
UPDATE course_holes SET yardage=334 WHERE course_id='laem_chabang_bc' AND tee_marker='red' AND hole_number=12;
UPDATE course_holes SET yardage=368 WHERE course_id='laem_chabang_bc' AND tee_marker='red' AND hole_number=13;
UPDATE course_holes SET yardage=143 WHERE course_id='laem_chabang_bc' AND tee_marker='red' AND hole_number=14;
UPDATE course_holes SET yardage=465 WHERE course_id='laem_chabang_bc' AND tee_marker='red' AND hole_number=15;
UPDATE course_holes SET yardage=372 WHERE course_id='laem_chabang_bc' AND tee_marker='red' AND hole_number=16;
UPDATE course_holes SET yardage=126 WHERE course_id='laem_chabang_bc' AND tee_marker='red' AND hole_number=17;
UPDATE course_holes SET yardage=369 WHERE course_id='laem_chabang_bc' AND tee_marker='red' AND hole_number=18;
DELETE FROM course_holes WHERE course_id='laem_chabang_bc' AND tee_marker='yellow';
INSERT INTO course_holes (course_id, hole_number, tee_marker, par, stroke_index, yardage) VALUES
 ('laem_chabang_bc',1,'yellow',4,10,280),
 ('laem_chabang_bc',2,'yellow',5,6,442),
 ('laem_chabang_bc',3,'yellow',4,4,279),
 ('laem_chabang_bc',4,'yellow',4,18,252),
 ('laem_chabang_bc',5,'yellow',3,14,123),
 ('laem_chabang_bc',6,'yellow',4,2,355),
 ('laem_chabang_bc',7,'yellow',4,12,236),
 ('laem_chabang_bc',8,'yellow',3,16,83),
 ('laem_chabang_bc',9,'yellow',5,8,390),
 ('laem_chabang_bc',10,'yellow',4,7,350),
 ('laem_chabang_bc',11,'yellow',5,5,424),
 ('laem_chabang_bc',12,'yellow',4,3,301),
 ('laem_chabang_bc',13,'yellow',4,1,336),
 ('laem_chabang_bc',14,'yellow',3,15,121),
 ('laem_chabang_bc',15,'yellow',5,11,440),
 ('laem_chabang_bc',16,'yellow',4,13,348),
 ('laem_chabang_bc',17,'yellow',3,17,108),
 ('laem_chabang_bc',18,'yellow',4,9,276);

-- cheechan (NEW hole data; was YAML-only)
INSERT INTO courses (id, name, location, country, total_holes, par) VALUES ('cheechan','Chee Chan Golf Resort','Pattaya','Thailand',18,72) ON CONFLICT (id) DO NOTHING;
DELETE FROM course_holes WHERE course_id='cheechan';
INSERT INTO course_holes (course_id, hole_number, tee_marker, par, stroke_index, yardage) VALUES
 ('cheechan',1,'black',4,17,398),
 ('cheechan',2,'black',5,7,555),
 ('cheechan',3,'black',3,15,189),
 ('cheechan',4,'black',4,11,424),
 ('cheechan',5,'black',4,3,448),
 ('cheechan',6,'black',3,13,202),
 ('cheechan',7,'black',4,5,450),
 ('cheechan',8,'black',4,1,485),
 ('cheechan',9,'black',5,9,577),
 ('cheechan',10,'black',4,14,380),
 ('cheechan',11,'black',4,6,459),
 ('cheechan',12,'black',3,18,161),
 ('cheechan',13,'black',4,2,472),
 ('cheechan',14,'black',5,12,585),
 ('cheechan',15,'black',4,16,340),
 ('cheechan',16,'black',5,8,578),
 ('cheechan',17,'black',3,10,217),
 ('cheechan',18,'black',4,4,425),
 ('cheechan',1,'blue',4,17,383),
 ('cheechan',2,'blue',5,7,518),
 ('cheechan',3,'blue',3,15,175),
 ('cheechan',4,'blue',4,11,394),
 ('cheechan',5,'blue',4,3,429),
 ('cheechan',6,'blue',3,13,182),
 ('cheechan',7,'blue',4,5,427),
 ('cheechan',8,'blue',4,1,450),
 ('cheechan',9,'blue',5,9,563),
 ('cheechan',10,'blue',4,14,344),
 ('cheechan',11,'blue',4,6,424),
 ('cheechan',12,'blue',3,18,145),
 ('cheechan',13,'blue',4,2,438),
 ('cheechan',14,'blue',5,12,552),
 ('cheechan',15,'blue',4,16,327),
 ('cheechan',16,'blue',5,8,546),
 ('cheechan',17,'blue',3,10,193),
 ('cheechan',18,'blue',4,4,391),
 ('cheechan',1,'white',4,17,360),
 ('cheechan',2,'white',5,7,497),
 ('cheechan',3,'white',3,15,148),
 ('cheechan',4,'white',4,11,379),
 ('cheechan',5,'white',4,3,415),
 ('cheechan',6,'white',3,13,165),
 ('cheechan',7,'white',4,5,401),
 ('cheechan',8,'white',4,1,433),
 ('cheechan',9,'white',5,9,539),
 ('cheechan',10,'white',4,14,324),
 ('cheechan',11,'white',4,6,406),
 ('cheechan',12,'white',3,18,132),
 ('cheechan',13,'white',4,2,420),
 ('cheechan',14,'white',5,12,536),
 ('cheechan',15,'white',4,16,295),
 ('cheechan',16,'white',5,8,529),
 ('cheechan',17,'white',3,10,177),
 ('cheechan',18,'white',4,4,371),
 ('cheechan',1,'red',4,17,280),
 ('cheechan',2,'red',5,7,422),
 ('cheechan',3,'red',3,15,122),
 ('cheechan',4,'red',4,11,323),
 ('cheechan',5,'red',4,3,354),
 ('cheechan',6,'red',3,13,131),
 ('cheechan',7,'red',4,5,324),
 ('cheechan',8,'red',4,1,357),
 ('cheechan',9,'red',5,9,446),
 ('cheechan',10,'red',4,14,263),
 ('cheechan',11,'red',4,6,348),
 ('cheechan',12,'red',3,18,99),
 ('cheechan',13,'red',4,2,360),
 ('cheechan',14,'red',5,12,460),
 ('cheechan',15,'red',4,16,225),
 ('cheechan',16,'red',5,8,447),
 ('cheechan',17,'red',3,10,132),
 ('cheechan',18,'red',4,4,313);

-- pattana: stale pre-merged 18 replaced by per-nine rows (A-Andreas has a PAR 6)
DELETE FROM course_holes WHERE course_id IN ('pattana','pattana_andreas','pattana_brookei','pattana_calypso');
DELETE FROM courses WHERE id IN ('pattana_andreas','pattana_brookei','pattana_calypso');
INSERT INTO courses (id, name, location, country, total_holes, par) VALUES
 ('pattana_andreas','Pattana — Andreas nine (Pattaya)','Pattaya','Thailand',9,37),
 ('pattana_brookei','Pattana — Brookei nine (Pattaya)','Pattaya','Thailand',9,36),
 ('pattana_calypso','Pattana — Calypso nine (Pattaya)','Pattaya','Thailand',9,36);
INSERT INTO course_holes (course_id, hole_number, tee_marker, par, stroke_index, yardage) VALUES
 ('pattana_andreas',1,'blue',4,6,427),
 ('pattana_andreas',2,'blue',5,9,525),
 ('pattana_andreas',3,'blue',3,8,170),
 ('pattana_andreas',4,'blue',4,1,450),
 ('pattana_andreas',5,'blue',6,7,663),
 ('pattana_andreas',6,'blue',4,4,391),
 ('pattana_andreas',7,'blue',4,5,410),
 ('pattana_andreas',8,'blue',3,3,190),
 ('pattana_andreas',9,'blue',4,2,460),
 ('pattana_andreas',1,'white',4,6,408),
 ('pattana_andreas',2,'white',5,9,470),
 ('pattana_andreas',3,'white',3,8,153),
 ('pattana_andreas',4,'white',4,1,431),
 ('pattana_andreas',5,'white',6,7,631),
 ('pattana_andreas',6,'white',4,4,357),
 ('pattana_andreas',7,'white',4,5,387),
 ('pattana_andreas',8,'white',3,3,177),
 ('pattana_andreas',9,'white',4,2,442),
 ('pattana_andreas',1,'yellow',4,6,389),
 ('pattana_andreas',2,'yellow',5,9,426),
 ('pattana_andreas',3,'yellow',3,8,136),
 ('pattana_andreas',4,'yellow',4,1,414),
 ('pattana_andreas',5,'yellow',6,7,590),
 ('pattana_andreas',6,'yellow',4,4,340),
 ('pattana_andreas',7,'yellow',4,5,365),
 ('pattana_andreas',8,'yellow',3,3,167),
 ('pattana_andreas',9,'yellow',4,2,425),
 ('pattana_andreas',1,'red',4,6,349),
 ('pattana_andreas',2,'red',5,9,408),
 ('pattana_andreas',3,'red',3,8,120),
 ('pattana_andreas',4,'red',4,1,383),
 ('pattana_andreas',5,'red',6,7,564),
 ('pattana_andreas',6,'red',4,4,273),
 ('pattana_andreas',7,'red',4,5,317),
 ('pattana_andreas',8,'red',3,3,135),
 ('pattana_andreas',9,'red',4,2,374),
 ('pattana_brookei',1,'blue',4,2,439),
 ('pattana_brookei',2,'blue',5,7,525),
 ('pattana_brookei',3,'blue',3,8,182),
 ('pattana_brookei',4,'blue',4,3,398),
 ('pattana_brookei',5,'blue',4,9,358),
 ('pattana_brookei',6,'blue',4,6,409),
 ('pattana_brookei',7,'blue',3,4,202),
 ('pattana_brookei',8,'blue',4,1,500),
 ('pattana_brookei',9,'blue',5,5,626),
 ('pattana_brookei',1,'white',4,2,427),
 ('pattana_brookei',2,'white',5,7,503),
 ('pattana_brookei',3,'white',3,8,159),
 ('pattana_brookei',4,'white',4,3,373),
 ('pattana_brookei',5,'white',4,9,347),
 ('pattana_brookei',6,'white',4,6,378),
 ('pattana_brookei',7,'white',3,4,185),
 ('pattana_brookei',8,'white',4,1,471),
 ('pattana_brookei',9,'white',5,5,577),
 ('pattana_brookei',1,'yellow',4,2,411),
 ('pattana_brookei',2,'yellow',5,7,455),
 ('pattana_brookei',3,'yellow',3,8,140),
 ('pattana_brookei',4,'yellow',4,3,353),
 ('pattana_brookei',5,'yellow',4,9,332),
 ('pattana_brookei',6,'yellow',4,6,360),
 ('pattana_brookei',7,'yellow',3,4,169),
 ('pattana_brookei',8,'yellow',4,1,449),
 ('pattana_brookei',9,'yellow',5,5,562),
 ('pattana_brookei',1,'red',4,2,373),
 ('pattana_brookei',2,'red',5,7,430),
 ('pattana_brookei',3,'red',3,8,124),
 ('pattana_brookei',4,'red',4,3,300),
 ('pattana_brookei',5,'red',4,9,295),
 ('pattana_brookei',6,'red',4,6,307),
 ('pattana_brookei',7,'red',3,4,142),
 ('pattana_brookei',8,'red',4,1,425),
 ('pattana_brookei',9,'red',5,5,500),
 ('pattana_calypso',1,'blue',4,4,382),
 ('pattana_calypso',2,'blue',3,8,144),
 ('pattana_calypso',3,'blue',5,9,525),
 ('pattana_calypso',4,'blue',4,2,419),
 ('pattana_calypso',5,'blue',4,3,403),
 ('pattana_calypso',6,'blue',4,1,407),
 ('pattana_calypso',7,'blue',3,6,193),
 ('pattana_calypso',8,'blue',5,7,577),
 ('pattana_calypso',9,'blue',4,5,422),
 ('pattana_calypso',1,'white',4,4,365),
 ('pattana_calypso',2,'white',3,8,126),
 ('pattana_calypso',3,'white',5,9,507),
 ('pattana_calypso',4,'white',4,2,398),
 ('pattana_calypso',5,'white',4,3,381),
 ('pattana_calypso',6,'white',4,1,386),
 ('pattana_calypso',7,'white',3,6,175),
 ('pattana_calypso',8,'white',5,7,556),
 ('pattana_calypso',9,'white',4,5,392),
 ('pattana_calypso',1,'yellow',4,4,342),
 ('pattana_calypso',2,'yellow',3,8,105),
 ('pattana_calypso',3,'yellow',5,9,492),
 ('pattana_calypso',4,'yellow',4,2,372),
 ('pattana_calypso',5,'yellow',4,3,361),
 ('pattana_calypso',6,'yellow',4,1,365),
 ('pattana_calypso',7,'yellow',3,6,153),
 ('pattana_calypso',8,'yellow',5,7,534),
 ('pattana_calypso',9,'yellow',4,5,363),
 ('pattana_calypso',1,'red',4,4,319),
 ('pattana_calypso',2,'red',3,8,88),
 ('pattana_calypso',3,'red',5,9,408),
 ('pattana_calypso',4,'red',4,2,332),
 ('pattana_calypso',5,'red',4,3,321),
 ('pattana_calypso',6,'red',4,1,285),
 ('pattana_calypso',7,'red',3,6,129),
 ('pattana_calypso',8,'red',5,7,500),
 ('pattana_calypso',9,'red',4,5,330);

-- burapha (nine_hole table; B-Belfry red column kept — site row corrupted)
UPDATE nine_hole SET par=4, hcp=14, blue=361, white=334, yellow=301, red=277 WHERE course_nine_id=5 AND hole=1;
-- A holes 2/4 hcp: site prints them SWAPPED; physical club card (Pete, 2026-07-31) = A2:6, A4:8.
UPDATE nine_hole SET par=4, hcp=6, blue=418, white=393, yellow=369, red=338 WHERE course_nine_id=5 AND hole=2;
UPDATE nine_hole SET par=3, hcp=18, blue=171, white=131, yellow=131, red=108 WHERE course_nine_id=5 AND hole=3;
UPDATE nine_hole SET par=4, hcp=8, blue=421, white=392, yellow=363, red=338 WHERE course_nine_id=5 AND hole=4;
UPDATE nine_hole SET par=5, hcp=12, blue=581, white=561, yellow=550, red=488 WHERE course_nine_id=5 AND hole=5;
UPDATE nine_hole SET par=3, hcp=16, blue=198, white=178, yellow=176, red=150 WHERE course_nine_id=5 AND hole=6;
UPDATE nine_hole SET par=5, hcp=10, blue=558, white=538, yellow=507, red=437 WHERE course_nine_id=5 AND hole=7;
UPDATE nine_hole SET par=4, hcp=4, blue=456, white=449, yellow=403, red=345 WHERE course_nine_id=5 AND hole=8;
UPDATE nine_hole SET par=4, hcp=2, blue=471, white=453, yellow=424, red=388 WHERE course_nine_id=5 AND hole=9;
UPDATE nine_hole SET par=4, hcp=3, blue=451, white=430, yellow=395 WHERE course_nine_id=6 AND hole=1;
UPDATE nine_hole SET par=4, hcp=13, blue=346, white=318, yellow=253 WHERE course_nine_id=6 AND hole=2;
UPDATE nine_hole SET par=3, hcp=17, blue=189, white=156, yellow=129 WHERE course_nine_id=6 AND hole=3;
UPDATE nine_hole SET par=4, hcp=9, blue=376, white=353, yellow=329 WHERE course_nine_id=6 AND hole=4;
UPDATE nine_hole SET par=4, hcp=5, blue=457, white=435, yellow=417 WHERE course_nine_id=6 AND hole=5;
UPDATE nine_hole SET par=5, hcp=11, blue=543, white=509, yellow=472 WHERE course_nine_id=6 AND hole=6;
UPDATE nine_hole SET par=4, hcp=1, blue=441, white=414, yellow=384 WHERE course_nine_id=6 AND hole=7;
UPDATE nine_hole SET par=3, hcp=15, blue=193, white=173, yellow=155 WHERE course_nine_id=6 AND hole=8;
UPDATE nine_hole SET par=5, hcp=7, blue=554, white=496, yellow=460 WHERE course_nine_id=6 AND hole=9;
UPDATE nine_hole SET par=4, hcp=2, blue=465, white=434, yellow=408, red=351 WHERE course_nine_id=7 AND hole=1;
UPDATE nine_hole SET par=5, hcp=6, blue=550, white=519, yellow=499, red=413 WHERE course_nine_id=7 AND hole=2;
UPDATE nine_hole SET par=4, hcp=10, blue=442, white=415, yellow=386, red=367 WHERE course_nine_id=7 AND hole=3;
UPDATE nine_hole SET par=4, hcp=14, blue=331, white=299, yellow=274, red=238 WHERE course_nine_id=7 AND hole=4;
UPDATE nine_hole SET par=3, hcp=18, blue=138, white=125, yellow=118, red=98 WHERE course_nine_id=7 AND hole=5;
UPDATE nine_hole SET par=4, hcp=12, blue=370, white=344, yellow=318, red=283 WHERE course_nine_id=7 AND hole=6;
UPDATE nine_hole SET par=5, hcp=4, blue=536, white=507, yellow=485, red=465 WHERE course_nine_id=7 AND hole=7;
UPDATE nine_hole SET par=3, hcp=16, blue=200, white=177, yellow=153, red=142 WHERE course_nine_id=7 AND hole=8;
UPDATE nine_hole SET par=4, hcp=8, blue=441, white=381, yellow=354, red=327 WHERE course_nine_id=7 AND hole=9;
UPDATE nine_hole SET par=5, hcp=13, blue=506, white=482, yellow=446, red=400 WHERE course_nine_id=8 AND hole=1;
UPDATE nine_hole SET par=3, hcp=11, blue=199, white=166, yellow=133, red=111 WHERE course_nine_id=8 AND hole=2;
UPDATE nine_hole SET par=4, hcp=7, blue=441, white=421, yellow=384, red=353 WHERE course_nine_id=8 AND hole=3;
UPDATE nine_hole SET par=4, hcp=3, blue=458, white=429, yellow=396, red=362 WHERE course_nine_id=8 AND hole=4;
UPDATE nine_hole SET par=5, hcp=9, blue=539, white=506, yellow=487, red=438 WHERE course_nine_id=8 AND hole=5;
UPDATE nine_hole SET par=4, hcp=5, blue=411, white=382, yellow=346, red=324 WHERE course_nine_id=8 AND hole=6;
UPDATE nine_hole SET par=4, hcp=17, blue=290, white=278, yellow=252, red=210 WHERE course_nine_id=8 AND hole=7;
UPDATE nine_hole SET par=3, hcp=15, blue=250, white=179, yellow=151, red=134 WHERE course_nine_id=8 AND hole=8;
UPDATE nine_hole SET par=4, hcp=1, blue=514, white=498, yellow=478, red=453 WHERE course_nine_id=8 AND hole=9;

COMMIT;

-- verify
SELECT course_id, tee_marker, count(*) h, sum(par) p, sum(yardage) y FROM course_holes
WHERE course_id IN ('siam_cc_old','siam_waterside','siam_rolling_hills','cheechan','pattana_andreas','pattana_brookei','pattana_calypso','laem_chabang_ab','laem_chabang_ac','laem_chabang_bc')
GROUP BY 1,2 ORDER BY 1,2;
