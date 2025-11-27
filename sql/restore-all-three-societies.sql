UPDATE society_profiles SET society_name = 'Travellers Rest Golf Group', society_logo = './societylogos/trgg.jpg', organizer_id = 'U2b6d976f19bca4b2f4374ae0e10ed873' WHERE society_name = 'JOA Golf Pattaya' AND organizer_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';

UPDATE society_profiles SET society_logo = './societylogos/JOAgolf.jpeg' WHERE organizer_id = 'JOAGOLFPAT';

SELECT id, organizer_id, society_name, society_logo FROM society_profiles ORDER BY society_name;
