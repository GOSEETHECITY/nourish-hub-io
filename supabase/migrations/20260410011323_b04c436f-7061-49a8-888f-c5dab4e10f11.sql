-- F2: Backfill food_listings where pickup_window_start = pickup_window_end
UPDATE public.food_listings
SET pickup_window_end = pickup_window_start + interval '2 hours'
WHERE pickup_window_start = pickup_window_end
  AND pickup_window_start IS NOT NULL;

-- F3: Fix coupon titles that equal the organization name (set to a generic title)
UPDATE public.coupons c
SET title = 'Surplus Food Special'
FROM public.organizations o
WHERE c.organization_id = o.id
  AND c.title = o.name;