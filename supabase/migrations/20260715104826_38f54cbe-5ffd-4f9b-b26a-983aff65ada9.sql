
ALTER TABLE public.food_listings DISABLE TRIGGER trg_enforce_receipt_deadline_on_claim;
ALTER TABLE public.food_listings DISABLE TRIGGER trg_push_flash_listing;

DO $$
DECLARE
  v_loc uuid;
  v_org uuid := '363fe15e-23aa-4408-ba7a-d8e0c0aa081f';
  v_michigan uuid := '5e7ffc2f-b1a7-4067-b999-e305aeae85f2';
  v_grace uuid := '2770238b-c894-4a7c-bba4-f00ef6665e3e';
  rec RECORD;
BEGIN
  -- Idempotency: only run if not already imported
  IF EXISTS (SELECT 1 FROM public.food_listings WHERE organization_id = v_org AND notes LIKE 'Quesadilla (103.8 lbs)%') THEN
    RETURN;
  END IF;

  SELECT id INTO v_loc FROM public.locations WHERE organization_id = v_org LIMIT 1;
  IF v_loc IS NULL THEN
    INSERT INTO public.locations (organization_id, name, address, city, state, zip, latitude, longitude, location_type, approval_status)
    VALUES (v_org, 'Oklahoma City Convention Center', '100 Mick Cornett Dr', 'Oklahoma City', 'OK', '73109', 35.4611, -97.5175, 'convention_center', 'approved')
    RETURNING id INTO v_loc;
  END IF;

  FOR rec IN
    SELECT * FROM (VALUES
      ('prepared_meals'::food_type, 405.10::numeric, 2025.50::numeric, '2026-05-15 12:00:00-05'::timestamptz, 'Quesadilla (103.8 lbs) Rice (22.1 lbs) Refried Beans (30.75 lbs) Enchilada Casserole (217.1 lbs) Tamales (31.35 lbs)', v_michigan),
      ('prepared_meals', 331.84, 1659.20, '2026-05-14 12:00:00-05', 'Coleslaw (127.6 lbs) Cookies (46.76 lbs) Taco Beef (11.72 lbs) Lime Rice (5.06 lbs) Tinga (33.94 lbs) BBQ Chicken (11 lbs) Chipotle Chicken (6.88 lbs) Bacon (11.54 lbs) Tomato (14.22 lbs) Mexican Rice (21.62 lbs) Enchilada Casserole (12.20 lbs) Guacamole (18.20 lbs) Lettuce (11.08 lbs)', v_grace),
      ('prepared_meals', 151.60, 757.80, '2026-04-28 12:00:00-05', 'Cake (16.1 lbs) Purple Slaw (7.5 lbs) Succotash (50 lbs) Potato Casserole (78 lbs)', v_michigan),
      ('prepared_meals', 319.15, 1595.75, '2025-12-11 13:00:00-06', 'Fruit (18.99 lbs) Green Beans (31.8 lbs) Chicken (15.58 lbs) Meatballs (31.14 lbs) Spaghetti (222.64 lbs)', v_grace),
      ('meat_protein', 400.00, 2000.00, '2025-12-05 12:00:00-06', 'Frozen Raw Turkeys (40 x 10 lbs)', v_michigan),
      ('produce', 364.00, 1456.00, '2025-10-09 11:30:00-05', 'Sweet Point Peppers (60 lbs) Cucumber (60 lbs) Pineapple Diced (10 lbs) Carrot Sticks (160 lbs) Spring Mix (24 lbs) Pear Carrot (10 lbs) Shredded Lettuce (40 lbs)', v_michigan),
      ('prepared_meals', 341.35, 1706.75, '2025-09-26 11:38:00-05', 'Grilled Chicken (162.57 lbs) Green Beans (178.78 lbs)', v_michigan),
      ('prepared_meals', 500.00, 1500.00, '2025-09-19 13:50:00-05', 'Box Lunches (250)', v_michigan),
      ('prepared_meals', 240.00, 720.00, '2025-09-17 12:00:00-05', 'Box Lunches (120)', v_grace),
      ('prepared_meals', 756.90, 3784.50, '2025-09-11 12:00:00-05', 'Split Pickup - Greens (247.71 lbs) Chicken (90.35 lbs) Roasted Vegetables (225.54 lbs) Green Beans (54.98 lbs) Mini Pies (7.68 lbs) Shrimp (138.32 lbs)', v_grace),
      ('produce', 756.00, 3780.00, '2025-09-10 12:00:00-05', 'Root Vegetables Collard Greens', v_michigan),
      ('frozen', 195.00, 1560.00, '2025-08-22 14:00:00-05', 'Frozen Steaks (13 cases x 15 lbs)', v_michigan),
      ('prepared_meals', 400.00, 1200.00, '2025-06-10 13:00:00-05', 'Box Lunches (200)', v_michigan),
      ('produce', 163.00, 815.00, '2025-05-08 12:00:00-05', 'Red Potato Wedge (8 lbs) Spring Mix (48 lbs) Salad Mix (105 lbs) Blueberries (4 pints)', v_michigan),
      ('prepared_meals', 128.18, 640.90, '2025-04-24 06:36:00-05', 'Chipotle Stewed Beef (25.41 lbs) Roasted Chicken Enchiladas (24.62 lbs) Pazole (45.70 lbs) Cilantro Rice (37.45 lbs)', v_michigan),
      ('prepared_meals', 213.20, 1279.20, '2025-04-17 12:00:00-05', 'Salad (32.93 lbs) Bacon (10.77 lbs) Potatoes (96.71 lbs) Eggs (72.79 lbs)', v_michigan),
      ('prepared_meals', 518.00, 1554.00, '2025-03-28 12:00:00-05', 'Turkey Box Lunch (70) Italian Box Lunch (60) Chicken Wrap Box Lunch (42) Chicken Salad Box Lunch (60) Vegan Box Lunch (27)', v_michigan),
      ('prepared_meals', 204.78, 1023.90, '2025-03-27 12:00:00-05', 'Roast Beef Sandwich (72) Turkey Sandwich (66) Chicken Salad Sandwich (52) Pasta Salad (14.78 lbs)', v_michigan),
      ('prepared_meals', 160.84, 963.00, '2025-03-25 12:00:00-06', 'Cotija Cheese (5.83 lbs) Pickled Red Onions (15.2 lbs) Salsa Fire Roasted (42.64 lbs) Tamale (52.25 lbs) Taco Meat (17.04 lbs) 6 oz Chicken (12.60 lbs) Mixed Veg (7.64 lbs)', v_michigan),
      ('prepared_meals', 447.03, 2235.15, '2025-03-06 12:00:00-06', 'Pasta (126.81 lbs) Brussels Sprouts (139.27 lbs) Chicken (34.95 lbs) Salad Mix (140 lbs) Spring Mix (6 lbs)', v_michigan),
      ('produce', 420.00, 1680.00, '2025-01-28 12:00:00-06', 'Brussels Sprouts (120 lbs) Dauphinois Potato (300 lbs)', v_michigan),
      ('prepared_meals', 200.00, 600.00, '2025-01-27 14:09:00-06', 'Ham Wrap Lunch (50) Turkey Sandwich Lunch (50)', v_grace)
    ) AS t(ftype, lbs, val, pickup_ts, items, np_id)
  LOOP
    INSERT INTO public.food_listings
      (location_id, organization_id, listing_type, food_type, pounds, estimated_donation_value,
       pickup_window_start, pickup_window_end, notes, status, nonprofit_claimed_id,
       picked_up_at, created_at, latitude, longitude)
    VALUES
      (v_loc, v_org, 'donation', rec.ftype, rec.lbs, rec.val,
       rec.pickup_ts, rec.pickup_ts + interval '2 hours', rec.items, 'completed', rec.np_id,
       rec.pickup_ts, rec.pickup_ts - interval '4 hours', 35.4611, -97.5175);
  END LOOP;
END $$;

ALTER TABLE public.food_listings ENABLE TRIGGER trg_enforce_receipt_deadline_on_claim;
ALTER TABLE public.food_listings ENABLE TRIGGER trg_push_flash_listing;
