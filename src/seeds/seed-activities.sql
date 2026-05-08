-- Seed activity templates + occurrences + gallery images.
-- Idempotent: run multiple times safely (uses ON CONFLICT on slugs).

BEGIN;

-- ── Activity Templates ────────────────────────────────────────────────────
INSERT INTO activity_templates (id, name, slug, description, category) VALUES
  (gen_random_uuid(), 'Opening Concert', 'opening-concert',
   'Kick off the festival with an electrifying opening performance featuring local and international artists.',
   'music'),
  (gen_random_uuid(), 'Art Workshop', 'art-workshop',
   'Get creative with local artists in our interactive workshop. Learn traditional Kosovo art techniques.',
   'workshop'),
  (gen_random_uuid(), 'Mountain Hiking Adventure', 'mountain-hiking',
   'Explore the stunning Peja mountains with experienced guides. Enjoy breathtaking views.',
   'adventure'),
  (gen_random_uuid(), 'Music Production Workshop', 'music-production',
   'Learn from professional music producers about beat making, mixing, and production techniques.',
   'workshop'),
  (gen_random_uuid(), 'Cultural Performance Night', 'cultural-performance',
   'Experience traditional Kosovo music, dance, and storytelling. Local performers share the rich cultural heritage.',
   'cultural'),
  (gen_random_uuid(), 'Food & Wine Tasting', 'food-wine',
   'Sample the best of Kosovo cuisine and wines. Local chefs and winemakers showcase their finest creations.',
   'food'),
  (gen_random_uuid(), 'Yoga & Meditation Session', 'yoga-meditation',
   'Start your day with inner peace and mindfulness. Professional yoga instructors guide you through relaxing poses.',
   'wellness'),
  (gen_random_uuid(), 'Closing Celebration', 'closing-celebration',
   'End the festival with a spectacular finale featuring fireworks, special performances, and a final celebration.',
   'music')
ON CONFLICT (slug) DO UPDATE
  SET name = EXCLUDED.name,
      description = EXCLUDED.description,
      category = EXCLUDED.category,
      updated_at = NOW();

-- ── Activity Occurrences ──────────────────────────────────────────────────
-- Festival: 2026-06-18 (Thu) → 2026-06-21 (Sun)
-- Capacities: workshops 30, adventure 15, music 200, food 50, wellness 25, cultural 200

WITH t AS (SELECT id, slug FROM activity_templates)
INSERT INTO activity_occurrences
  (template_id, date, start_time, end_time, capacity, location, meeting_point)
SELECT t.id, x.date::date, x.start_time::time, x.end_time::time, x.capacity, x.location, x.meeting_point
FROM t
JOIN (VALUES
  -- Thursday, June 18
  ('opening-concert',     '2026-06-18', '19:00', '23:00', 200, 'Main Stage',          'Festival Entrance'),
  ('art-workshop',        '2026-06-18', '10:00', '18:00',  30, 'Creative Zone',       'Info Tent A'),

  -- Friday, June 19
  ('art-workshop',        '2026-06-19', '10:00', '18:00',  30, 'Creative Zone',       'Info Tent A'),
  ('mountain-hiking',     '2026-06-19', '08:00', '14:00',  15, 'Rugova Canyon Trail', 'Parking Lot B'),
  ('music-production',    '2026-06-19', '15:00', '19:00',  30, 'Studio Tent',         'Main Plaza'),

  -- Saturday, June 20
  ('art-workshop',        '2026-06-20', '10:00', '18:00',  30, 'Creative Zone',       'Info Tent A'),
  ('cultural-performance','2026-06-20', '20:00', '22:30', 200, 'Cultural Pavilion',   'Main Plaza'),
  ('food-wine',           '2026-06-20', '12:00', '17:00',  50, 'Food Court Area',     'Culinary Tent'),

  -- Sunday, June 21
  ('art-workshop',        '2026-06-21', '10:00', '18:00',  30, 'Creative Zone',       'Info Tent A'),
  ('food-wine',           '2026-06-21', '12:00', '17:00',  50, 'Food Court Area',     'Culinary Tent'),
  ('yoga-meditation',     '2026-06-21', '08:00', '10:00',  25, 'Wellness Area',       'Yoga Pavilion'),
  ('closing-celebration', '2026-06-21', '21:00', '23:59', 200, 'Main Stage',          'Central Square')
) AS x(slug, date, start_time, end_time, capacity, location, meeting_point) ON x.slug = t.slug
ON CONFLICT DO NOTHING;

-- ── Gallery Images ────────────────────────────────────────────────────────
INSERT INTO gallery_images (url, alt, title, caption, section, sort_order) VALUES
  ('https://images.unsplash.com/photo-1561577862-49a301dda61b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', 'Festival crowd', 'Opening Night 2025', '15,000+ attendees', 'live', 1),
  ('https://images.unsplash.com/photo-1719650932800-ebb72adb2d2a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', 'Main stage performance', 'Main Stage Headliner', 'Saturday Night 2025', 'live', 2),
  ('https://images.unsplash.com/photo-1744292456199-bb080861b95d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', 'Guitar performance', 'Live Band Session', 'Acoustic Stage 2025', 'live', 3),
  ('https://images.unsplash.com/photo-1744292455872-a5b0ff4557bd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', 'Musician close-up', 'Guitar Solo', 'Intimate moment', 'live', 4),
  ('https://images.unsplash.com/photo-1760135436773-af6c70a4dff4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', 'Sunset performance', 'Golden Hour Set', 'Sunset performance', 'live', 5),
  ('https://images.unsplash.com/photo-1777109563984-da169e10fa99?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', 'Festival grounds', 'Festival Pathways', 'Between stages', 'live', 6),

  ('https://images.unsplash.com/photo-1770739879041-22f0dfc37301?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', 'Art workshop', 'Outdoor Art Class', 'Creative Zone 2025', 'workshops', 1),
  ('https://images.unsplash.com/photo-1751883895630-8d9f55617dec?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', 'Painting workshop', 'Traditional Art Workshop', 'Learning local techniques', 'workshops', 2),
  ('https://images.unsplash.com/photo-1560831340-b9679dc9e9f0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', 'Group activity', 'Community Gathering', 'Making connections', 'workshops', 3),
  ('https://images.unsplash.com/photo-1569244476396-e8a47aaa4abe?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', 'Festival booth', 'Info & Activities', 'Festival information', 'workshops', 4),
  ('https://images.unsplash.com/photo-1593356703089-7870ec2d46db?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', 'Relaxation zone', 'Chill Zone', 'Relaxation area', 'workshops', 5),

  ('https://images.unsplash.com/photo-1515630894600-512122ba9e63?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', 'Mountain hiker', 'Summit Adventure', 'Mountain hiking 2025', 'adventures', 1),
  ('https://images.unsplash.com/photo-1704323019315-f6a68369ceae?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', 'Trail hiking', 'Rugova Canyon Trail', 'Scenic hiking route', 'adventures', 2),
  ('https://images.unsplash.com/photo-1767909599777-f73144edcfc2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', 'Valley hikers', 'Valley Exploration', 'Group hike', 'adventures', 3),
  ('https://images.unsplash.com/photo-1708552592289-350724a8e695?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', 'Mountain landscape', 'Scenic Views', 'Nature beauty', 'adventures', 4),
  ('https://images.unsplash.com/photo-1653484592666-7cee3119eccd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', 'Peak viewpoint', 'Peak Celebration', 'Achievement moment', 'adventures', 5),

  ('https://images.unsplash.com/photo-1753080284810-c5e6f02f6d45?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', 'Wine tasting event', 'Wine Tasting', 'Local varieties', 'food', 1),
  ('https://images.unsplash.com/photo-1598284444079-ab715eed2b88?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', 'Outdoor wine tasting', 'Culinary Experience', 'Food & wine pairing', 'food', 2),
  ('https://images.unsplash.com/photo-1694443777262-940e12919607?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', 'Wine selection', 'Premium Selection', 'Tasting session', 'food', 3),
  ('https://images.unsplash.com/photo-1598284443905-995dabe870fa?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', 'Social wine tasting', 'Social Gathering', 'Wine & friends', 'food', 4),
  ('https://images.unsplash.com/photo-1722012992402-eb2ad5fe5df2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', 'Wine glasses', 'Elegant Tasting', 'Fine wines', 'food', 5)
ON CONFLICT DO NOTHING;

COMMIT;
